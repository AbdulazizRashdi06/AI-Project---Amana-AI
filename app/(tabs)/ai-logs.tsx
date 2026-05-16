import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { colors } from "@/theme/colors";

type Slide = {
  kicker: string;
  title: string;
  summary: string;
  bullets: string[];
  tags: string[];
  spotlight?: string;
};

const slides: Slide[] = [
  {
    kicker: "AI Amana",
    title: "Smart Lost-And-Found",
    summary: "Campus reports are matched automatically with a fast AI pipeline instead of manual scanning.",
    bullets: [
      "Students submit lost/found reports with text and photos.",
      "System finds likely matches and suggests only strong candidates.",
      "Admins and users review suggestions in a secure workflow.",
    ],
    tags: ["Real-time", "Campus-scale", "Human review"],
    spotlight: "Pitch line: quick scan first, smart review second.",
  },
  {
    kicker: "Architecture",
    title: "Two-Stage Matching Engine",
    summary: "We use embeddings for speed, then reasoning for quality.",
    bullets: [
      "Stage 1: convert report details into vectors and shortlist candidates.",
      "Stage 2: run deep pair reasoning on shortlisted candidates only.",
      "Final output combines similarity scores and model judgment.",
    ],
    tags: ["Embedding retrieval", "Reranking", "Precision at scale"],
  },
  {
    kicker: "Technical Depth",
    title: "Signal Fusion Scoring",
    summary: "Matches are scored across multiple dimensions before AI rerank.",
    bullets: [
      "Cosine similarity over embeddings for semantic closeness.",
      "Boosts for category, location, item-detail overlap, and date proximity.",
      "Thresholding keeps weak candidates out before expensive reasoning.",
    ],
    tags: ["Cosine similarity", "Heuristic boosts", "Threshold control"],
  },
  {
    kicker: "Reliability",
    title: "Fallback-Ready Pipeline",
    summary: "System remains operational even if cloud AI is unavailable.",
    bullets: [
      "Deterministic local fallback avoids total pipeline failure.",
      "Per-step logs capture inputs, outputs, and errors for traceability.",
      "Re-run support allows safe recovery and debugging.",
    ],
    tags: ["Resilience", "Observability", "Fault tolerance"],
  },
  {
    kicker: "Cost Intelligence",
    title: "Run-Level Cost Tracking",
    summary: "Every run estimates spend and projects cost at higher volumes.",
    bullets: [
      "run_cost_usd is calculated from token usage and model rates.",
      "Projection fields estimate cost for 6, 10, 100, 1k, 10k reports.",
      "High-cost runs are flagged using average-based thresholds.",
    ],
    tags: ["Cost controls", "Budget planning", "Token analytics"],
  },
  {
    kicker: "Model Lab",
    title: "Cross-Model Cost Table",
    summary: "Interactive table compares model spend from 10 up to 1,000,000 report comparisons.",
    bullets: [
      "Models include ChatGPT, Claude, Kimi, MiniMax, DeepSeek, Gemini.",
      "Pricing inputs are editable to keep estimates current.",
      "Table uses your real run averages, not generic assumptions.",
    ],
    tags: ["Comparative pricing", "Scenario simulation", "Data-driven decisions"],
    spotlight: "Use this live during your demo to compare cost strategy in seconds.",
  },
  {
    kicker: "Roadmap",
    title: "What Comes Next",
    summary: "This project can evolve into a production-grade AI ops platform.",
    bullets: [
      "Auto model routing by ambiguity and budget policies.",
      "Evaluation harness with precision/recall benchmark sets.",
      "PII redaction layer and trust/safety audit controls.",
    ],
    tags: ["Adaptive routing", "Evaluation suite", "Safety by design"],
  },
];

export default function AiLogsScreen() {
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);

  const activeSlide = slides[slideIndex];
  const progressLabel = useMemo(() => `${slideIndex + 1} / ${slides.length}`, [slideIndex]);

  function previousSlide() {
    setSlideIndex((current) => (current === 0 ? slides.length - 1 : current - 1));
  }

  function nextSlide() {
    setSlideIndex((current) => (current === slides.length - 1 ? 0 : current + 1));
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>Presentation Mode</Text>
        <Text style={styles.title}>AI Amana Project Deck</Text>
        <Text style={styles.body}>Use this tab as your live presentation page. Swipe by buttons, tap dots to jump, and open the cost table for live pricing demos.</Text>
      </View>

      <View style={styles.deckCard}>
        <View style={styles.deckAccentA} />
        <View style={styles.deckAccentB} />
        <View style={styles.deckTopBar}>
          <Text style={styles.slideKicker}>{activeSlide.kicker}</Text>
          <Text style={styles.progress}>{progressLabel}</Text>
        </View>

        <Text style={styles.slideTitle}>{activeSlide.title}</Text>
        <Text style={styles.slideSummary}>{activeSlide.summary}</Text>

        <View style={styles.bulletBlock}>
          {activeSlide.bullets.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tagsRow}>
          {activeSlide.tags.map((tag) => (
            <Text key={tag} style={styles.tag}>{tag}</Text>
          ))}
        </View>

        {activeSlide.spotlight ? <Text style={styles.spotlight}>{activeSlide.spotlight}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Button title="Previous" variant="ghost" onPress={previousSlide} />
        <Button title="Next" variant="secondary" onPress={nextSlide} />
        <Button title="Open Cost Table" variant="primary" onPress={() => router.push("/cost-table")} />
      </View>

      <View style={styles.pagination}>
        {slides.map((_slide, index) => (
          <Pressable
            key={index}
            onPress={() => setSlideIndex(index)}
            accessibilityRole="button"
            accessibilityLabel={`Go to slide ${index + 1}`}
            style={[styles.pageDot, index === slideIndex ? styles.pageDotActive : styles.pageDotIdle]}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  kicker: {
    color: colors.primary,
    textTransform: "uppercase",
    fontWeight: "900",
    letterSpacing: 1.1,
    fontSize: 12,
  },
  title: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: "900",
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
    maxWidth: 860,
  },
  deckCard: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: colors.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    padding: 18,
    gap: 14,
  },
  deckAccentA: {
    position: "absolute",
    right: -40,
    top: -34,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: "rgba(255,199,3,0.18)",
  },
  deckAccentB: {
    position: "absolute",
    left: -30,
    bottom: -36,
    width: 120,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(213,227,255,0.14)",
  },
  deckTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  slideKicker: {
    color: colors.goldSoft,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "900",
    fontSize: 12,
  },
  progress: {
    color: colors.primarySoft,
    fontWeight: "800",
    fontSize: 12,
  },
  slideTitle: {
    color: "#ffffff",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    maxWidth: 900,
  },
  slideSummary: {
    color: colors.primarySoft,
    lineHeight: 22,
    fontSize: 16,
    maxWidth: 920,
  },
  bulletBlock: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  bulletDot: {
    marginTop: 8,
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: colors.gold,
  },
  bulletText: {
    flex: 1,
    color: "#ffffff",
    lineHeight: 21,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  tag: {
    color: colors.secondary,
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "900",
  },
  spotlight: {
    color: colors.goldSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,223,148,0.4)",
    backgroundColor: "rgba(255,223,148,0.08)",
    padding: 10,
    lineHeight: 20,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
  },
  pageDot: {
    width: 11,
    height: 11,
    borderRadius: 99,
  },
  pageDotActive: {
    backgroundColor: colors.primary,
  },
  pageDotIdle: {
    backgroundColor: colors.border,
  },
});
