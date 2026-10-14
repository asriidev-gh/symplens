import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, Share, View } from "react-native";
import { BottomSheet, ConfirmSheet } from "@/components/BottomSheet";
import { useToast } from "@/components/Toast";
import { EmergencyBanner } from "@/components/EmergencyBanner";
import { Button, Card, Chip, Gap, IconHeading, IconLine, Screen, T, UrgencyBadge } from "@/components/ui";
import { LANGUAGES, categoryKey, translate, type TKey } from "@/i18n";
import type { IconName } from "@/components/Icon";
import { ApiError, contribute, translateAnalysis } from "@/lib/api";
import { LanguageSheet } from "@/components/LanguageSheet";
import { buildDoctorHtml, shareHtmlAsPdf } from "@/lib/doctorSummary";
import { openCare } from "@/lib/care";
import { dayLabel, toExportText, toPlainText } from "@/lib/format";
import { canSavePhotos, readPhotoBase64, savePhoto, usePhotoUri } from "@/lib/photos";
import { discardAttachment, releaseAttachment, setDraft, useCurrent, useDraft } from "@/lib/session";
import { speak, stopSpeaking } from "@/lib/speech";
import { useStore } from "@/lib/store";
import type { AnalysisResponse, Locale } from "@/lib/types";
import { colors, space, urgencyStyle } from "@/theme";

export default function Result() {
  const { t, history, settings, removeHistory, updateHistory } = useStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const current = useCurrent();
  const draft = useDraft();
  const [reading, setReading] = useState(false);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [share, setShare] = useState<"idle" | "sent" | "unavailable">("idle");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const toast = useToast();

  // Translation view: null = the original text. Only the result changes; the app language stays as it is.
  const [viewLocale, setViewLocale] = useState<Locale | null>(null);
  const [translations, setTranslations] = useState<Partial<Record<Locale, AnalysisResponse>>>({});
  const [translating, setTranslating] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [doctorOpen, setDoctorOpen] = useState(false);

  const entry = id ? history.find((h) => h.id === id) : undefined;
  const response: AnalysisResponse | undefined = entry?.response ?? current?.response;
  const isCurrent = !id;
  // The saved history entry for what is on screen (the just-finished analysis is saved too, unless Private Mode).
  const savedEntry = entry ?? (current?.savedId ? history.find((h) => h.id === current.savedId) : undefined);
  const origLocale: Locale = entry?.locale ?? current?.locale ?? settings.locale;
  const shown: AnalysisResponse | undefined = (viewLocale ? translations[viewLocale] : undefined) ?? response;
  const isTranslated = !!viewLocale && !!translations[viewLocale];
  const rl: Locale = isTranslated ? (viewLocale as Locale) : settings.locale;
  const rt = (k: TKey) => translate(rl, k);

  // Privacy: drop the photo from memory and disk when leaving the result.
  useEffect(
    () => () => {
      stopSpeaking();
      if (isCurrent) releaseAttachment();
    },
    [isCurrent],
  );

  const text = useMemo(() => (shown ? toPlainText(shown, (k) => translate(rl, k)) : ""), [shown, rl]);

  if (!response) {
    return (
      <Screen back onBack={() => router.dismissAll()}>
        <T>{t("errorBody")}</T>
      </Screen>
    );
  }

  const a = (shown ?? response).analysis;
  const urg = a.urgency;
  const goHome = () => router.dismissAll();

  const toggleRead = () => {
    if (reading) {
      stopSpeaking();
      setReading(false);
    } else {
      setReading(true);
      speak(text, rl, () => setReading(false));
    }
  };

  const onExport = () =>
    Share.share({
      message: toExportText({ createdAt: entry?.createdAt ?? Date.now(), response: shown ?? response }, rt),
    }).catch(() => {});

  const doTranslate = async (target: Locale) => {
    stopSpeaking();
    setReading(false);
    if (target === origLocale) {
      setViewLocale(null);
      return;
    }
    if (translations[target]) {
      setViewLocale(target);
      return;
    }
    setTranslating(true);
    try {
      const r = await translateAnalysis(response.analysis, target, settings.installId);
      setTranslations((p) => ({ ...p, [target]: { ...response, analysis: r.analysis } }));
      setViewLocale(target);
    } catch (e) {
      toast.show({ message: e instanceof ApiError && e.kind === "offline" ? t("offlineBody") : t("translateFailed"), kind: "error" });
    } finally {
      setTranslating(false);
    }
  };

  const shownResponse = shown ?? response;

  // ---- progress tracking
  const trackKey = savedEntry ? (savedEntry.trackId ?? savedEntry.id) : undefined;
  const checks = trackKey
    ? history.filter((h) => (h.trackId ?? h.id) === trackKey).sort((x, y) => x.createdAt - y.createdAt)
    : [];
  const firstPhoto = checks.find((c) => c.photoUri);
  const lastPhoto = [...checks].reverse().find((c) => c.photoUri);
  const canCompare = !!firstPhoto && !!lastPhoto && firstPhoto.id !== lastPhoto.id;
  const canSavePhoto = canSavePhotos && isCurrent && !!savedEntry && !savedEntry.photoUri && !!draft.attachment?.previewUri;

  const onSavePhoto = async () => {
    const uri = draft.attachment?.previewUri;
    if (!uri || !savedEntry) return;
    try {
      const dest = await savePhoto(savedEntry.id, uri);
      updateHistory(savedEntry.id, { photoUri: dest });
      toast.show({ message: rt("trackSaved"), kind: "success" });
    } catch {
      toast.show({ message: t("errorBody"), kind: "error" });
    }
  };

  const onRecheck = () => {
    if (!savedEntry) return;
    // Start a new check of the same person/area. Keeps the earlier result on screen underneath.
    discardAttachment();
    setDraft({
      mode: "symptom",
      subject: savedEntry.subject,
      attachment: null,
      description: "",
      duration: undefined,
      answers: [],
      previousEntryId: savedEntry.id,
    });
    router.push("/analyze/photo");
  };

  // ---- doctor summary
  const hasPhotoForDoctor = (isCurrent && draft.attachment?.mediaType === "image/jpeg" && !!draft.attachment.data) || !!savedEntry?.photoUri;
  const shareDoctor = async (withPhoto: boolean) => {
    setDoctorOpen(false);
    try {
      let photoB64: string | undefined;
      if (withPhoto) {
        if (isCurrent && draft.attachment?.mediaType === "image/jpeg") photoB64 = draft.attachment.data;
        else if (savedEntry?.photoUri) photoB64 = (await readPhotoBase64(savedEntry.photoUri)) ?? undefined;
      }
      const html = buildDoctorHtml({
        t: rt,
        response: shownResponse,
        createdAt: savedEntry?.createdAt ?? Date.now(),
        subject: savedEntry?.subject ?? draft.subject,
        description: savedEntry?.description ?? draft.description,
        photoB64,
      });
      await shareHtmlAsPdf(html, rt("doctorTitle"));
    } catch {
      toast.show({ message: t("errorBody"), kind: "error" });
    }
  };
  const onDoctor = () => (hasPhotoForDoctor ? setDoctorOpen(true) : shareDoctor(false));

  const answered = a.follow_up_questions.filter((q) => picked[q.id]);
  const updateAnalysis = () => {
    setDraft({
      answers: [
        ...draft.answers,
        ...answered.map((q) => ({ question: q.question, answer: picked[q.id] })),
      ],
    });
    router.push("/processing");
  };

  const onContribute = async () => {
    // Opt-in, anonymous patterns only: no photo, no free text from the user, no identifiers.
    try {
      await contribute(
        {
          consent: true,
          category: a.category,
          age_group: draft.subject?.ageGroup ?? "adult",
          visual_features: [],
          symptoms: [],
          duration_bucket: draft.duration,
          red_flags: a.red_flags.slice(0, 10).map((s) => s.slice(0, 80)),
          ai_observations: a.observations.slice(0, 8).map((s) => s.slice(0, 200)),
        },
        settings.installId,
      );
      setShare("sent");
      toast.show({ message: t("contributeThanks"), kind: "success" });
    } catch {
      setShare("unavailable");
      toast.show({ message: t("errorBody"), kind: "error" });
    }
  };

  return (
    <Screen back onBack={isCurrent ? goHome : undefined}>
      {response.emergency && <EmergencyBanner reasons={response.emergencyReasons} locale={rl} />}

      <View style={{ gap: space.xs }}>
        <T v="small" color={colors.inkSoft}>
          {rt(categoryKey(a.category))}
        </T>
        <T v="title" accessibilityRole="header">{rt("resultTitle")}</T>
      </View>

      <View style={{ flexDirection: "row", gap: space.md }}>
        {settings.voicePlayback && (
          <View style={{ flex: 1 }}>
            <Button kind="secondary" icon={reading ? "stop-circle-outline" : "volume-high-outline"} label={reading ? rt("stopReading") : rt("readAloud")} onPress={toggleRead} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Button
            kind="secondary"
            icon="language-outline"
            label={translating ? rt("translating") : isTranslated ? (LANGUAGES.find((l) => l.code === viewLocale)?.label ?? rt("translateBtn")) : rt("translateBtn")}
            disabled={translating}
            onPress={() => setPickerOpen(true)}
          />
        </View>
      </View>

      {isTranslated && (
        <Card style={{ backgroundColor: colors.brandSoft, borderColor: colors.brandBorder }}>
          <T v="small" color={colors.inkSoft}>{rt("translatedNote")}</T>
          <Button kind="ghost" label={rt("showOriginal")} onPress={() => { stopSpeaking(); setReading(false); setViewLocale(null); }} />
        </Card>
      )}

      {!a.image_usable && (
        <Card style={{ backgroundColor: urgencyStyle.needs_attention.bg, borderColor: urgencyStyle.needs_attention.border }}>
          <T color={urgencyStyle.needs_attention.fg}>{rt("imageUnusable")}</T>
        </Card>
      )}

      <T>{a.summary}</T>

      {/* The first thing a patient wants to know: how worried should I be? */}
      <Block icon="speedometer-outline" title={rt("concernTitle")}>
        <UrgencyBadge large urgency={urg} label={rt(`urg_${urg}` as TKey)} desc={rt(`urgDesc_${urg}` as TKey)} />
        <T color={colors.inkSoft}>{a.urgency_reason}</T>
      </Block>

      {a.progress_note ? (
        <Card style={{ backgroundColor: colors.brandSoft, borderColor: colors.brandBorder }}>
          <IconHeading icon="trending-up-outline">{rt("trackNoteTitle")}</IconHeading>
          <T>{a.progress_note}</T>
        </Card>
      ) : null}

      {a.observations.length > 0 && (
        <Block icon="eye-outline" title={rt("seeTitle")}>
          {a.observations.map((o) => (
            <T key={o}>• {o}</T>
          ))}
        </Block>
      )}

      {a.possible_explanations.length > 0 && (
        <Block icon="bulb-outline" title={rt("meanTitle")}>
          {a.possible_explanations.map((p) => (
            <View key={p.name} style={{ gap: 2 }}>
              <T v="label">
                {p.name} <T v="small" color={colors.inkSoft}>· {rt(`conf_${p.confidence}` as TKey)}</T>
              </T>
              <T color={colors.inkSoft}>{p.description}</T>
            </View>
          ))}
        </Block>
      )}

      {a.lab_values && a.lab_values.length > 0 && (
        <Block icon="flask-outline" title={rt("labTitle")}>
          {a.lab_values.map((l, i) => (
            <View key={`${l.test}${i}`} style={{ flexDirection: "row", justifyContent: "space-between", gap: space.md }}>
              <View style={{ flex: 1 }}>
                <T v="label">{l.test}</T>
                {l.reference_range ? <T v="small" color={colors.inkSoft}>{l.reference_range}</T> : null}
              </View>
              <T v="label" color={l.flag === "normal" ? colors.teal : l.flag === "unclear" ? colors.inkSoft : colors.danger}>
                {l.result} · {rt(`flag_${l.flag}` as TKey)}
              </T>
            </View>
          ))}
        </Block>
      )}

      {a.red_flags.length > 0 && (
        <Block icon="warning-outline" title={rt("watchTitle")}>
          {a.red_flags.map((f) => (
            <T key={f}>• {f}</T>
          ))}
        </Block>
      )}

      <Block icon="checkmark-circle-outline" title={rt("nextTitle")}>
        {a.next_steps.map((s) => (
          <T key={s}>• {s}</T>
        ))}
      </Block>

      {a.questions_for_doctor && a.questions_for_doctor.length > 0 && (
        <Block icon="help-circle-outline" title={rt("doctorQuestions")}>
          {a.questions_for_doctor.map((q) => (
            <T key={q}>• {q}</T>
          ))}
        </Block>
      )}

      <View style={{ gap: space.sm }}>
        {urg !== "low" && (
          <>
            <Button kind={urg === "urgent" ? "primary" : "secondary"} icon="location-outline" label={rt("careFind")} onPress={() => openCare(urg, rl)} />
            <IconLine icon="lock-closed-outline">{rt("careNote")}</IconLine>
          </>
        )}
        <Button kind="secondary" icon="document-text-outline" label={rt("doctorShare")} onPress={onDoctor} />
      </View>

      {savedEntry && (
        <Card>
          <IconHeading icon="trending-up-outline">{rt("trackTitle")}</IconHeading>

          {checks.length > 1 && (
            <View style={{ gap: space.xs }}>
              {checks.map((c) => {
                const here = c.id === savedEntry.id;
                const u = c.response.analysis.urgency;
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${dayLabel(c.createdAt, rt)}, ${rt(`urg_${u}` as TKey)}`}
                    onPress={() => !here && router.push({ pathname: "/result", params: { id: c.id } })}
                    style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <T v={here ? "label" : "body"} color={here ? colors.ink : colors.inkSoft}>{dayLabel(c.createdAt, rt)}</T>
                    <T v="small" color={urgencyStyle[u].fg} style={{ fontFamily: "DMSans_700Bold" }}>{rt(`urg_${u}` as TKey)}</T>
                  </Pressable>
                );
              })}
            </View>
          )}

          {canCompare && firstPhoto && lastPhoto && (
            <View style={{ flexDirection: "row", gap: space.md }}>
              {[
                { c: firstPhoto, label: rt("trackThen") },
                { c: lastPhoto, label: rt("trackNow") },
              ].map(({ c, label }) => (
                <View key={c.id} style={{ flex: 1, gap: space.xs }}>
                  <SavedPhoto uri={c.photoUri} style={{ width: "100%", aspectRatio: 1, borderRadius: 14, backgroundColor: colors.line }} label={label} />
                  <T v="small" color={colors.inkSoft} style={{ textAlign: "center" }}>{label} · {dayLabel(c.createdAt, rt)}</T>
                </View>
              ))}
            </View>
          )}

          {savedEntry.photoUri ? <IconLine icon="lock-closed-outline">{rt("trackSaved")}</IconLine> : null}
          {canSavePhoto && <Button kind="secondary" icon="download-outline" label={rt("trackSave")} onPress={onSavePhoto} />}
          <Button icon="refresh-outline" label={rt("trackRecheck")} onPress={onRecheck} />
        </Card>
      )}

      {isCurrent && !isTranslated && a.needs_follow_up && a.follow_up_questions.length > 0 && !response.emergency && (
        <Card style={{ backgroundColor: colors.brandSoft, borderColor: colors.brandBorder }}>
          <T>{rt("followUpIntro")}</T>
          {a.follow_up_questions.map((q) => (
            <View key={q.id} style={{ gap: space.sm }}>
              <Gap h={space.xs} />
              <T v="label">{q.question}</T>
              <View accessibilityRole="radiogroup" style={{ gap: space.sm }}>
                {q.options.map((o) => (
                  <Chip
                    key={o.id}
                    label={o.label}
                    selected={picked[q.id] === o.label}
                    onPress={() => setPicked((p) => ({ ...p, [q.id]: o.label }))}
                  />
                ))}
              </View>
            </View>
          ))}
          <Gap h={space.sm} />
          <Button label={rt("updateAnalysis")} disabled={answered.length === 0} onPress={updateAnalysis} />
        </Card>
      )}

      {a.limitations.length > 0 && (
        <Block icon="information-circle-outline" title={rt("limitationsTitle")}>
          {a.limitations.map((l) => (
            <T key={l} color={colors.inkSoft}>• {l}</T>
          ))}
        </Block>
      )}

      <Card>
        <IconHeading icon="chatbubble-ellipses-outline">{rt("askTitle")}</IconHeading>
        <Button label={rt("askBtn")} onPress={() => router.push({ pathname: "/chat", params: id ? { id } : {} })} />
      </Card>

      {isCurrent && !response.emergency && share === "idle" && (
        <Card>
          <T v="h2" accessibilityRole="header">{rt("contributeTitle")}</T>
          <T color={colors.inkSoft}>{rt("contributeBody")}</T>
          <Button label={rt("contributeYes")} onPress={onContribute} />
          <Button kind="ghost" label={rt("contributeNo")} onPress={() => setShare("unavailable")} />
        </Card>
      )}
      
      <View style={{ flexDirection: "row", gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Button kind="secondary" label={rt("exportShare")} onPress={onExport} />
        </View>
        {entry && (
          <View style={{ flex: 1 }}>
            <Button kind="danger" label={rt("delete")} onPress={() => setConfirmDelete(true)} />
          </View>
        )}
      </View>

      {isCurrent && (
        <T v="small" color={colors.inkSoft}>
          {current?.saved ? rt("savedLocally") : settings.privateMode ? rt("privateNotSaved") : ""}
        </T>
      )}
      <T v="small" color={colors.inkSoft}>{rt("notDiagnosis")}</T>
      <BottomSheet visible={doctorOpen} onClose={() => setDoctorOpen(false)} title={rt("doctorTitle")}>
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <Button icon="image-outline" label={rt("doctorWithPhoto")} onPress={() => shareDoctor(true)} />
          <Button kind="secondary" icon="document-text-outline" label={rt("doctorSummaryOnly")} onPress={() => shareDoctor(false)} />
        </View>
      </BottomSheet>
      <LanguageSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={rt("translateTitle")}
        selected={viewLocale ?? origLocale}
        onSelect={doTranslate}
      />
      <ConfirmSheet
        visible={confirmDelete}
        title={rt("delete")}
        message={rt("deleteOneConfirm")}
        confirmLabel={rt("delete")}
        cancelLabel={rt("cancel")}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          if (entry) removeHistory(entry.id);
          router.back();
        }}
      />
    </Screen>
  );
}

function Block({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Card>
      <IconHeading icon={icon}>{title}</IconHeading>
      {children}
    </Card>
  );
}

function SavedPhoto({ uri, label, style }: { uri?: string; label: string; style: object }) {
  const src = usePhotoUri(uri);
  return <Image source={src ? { uri: src } : undefined} style={style} resizeMode="cover" accessibilityLabel={label} />;
}
