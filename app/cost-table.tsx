import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { useAuth } from "@/features/auth/AuthContext";
import { useUserAiLogs } from "@/features/aiLogs/hooks";
import { colors } from "@/theme/colors";
import type { AiLogRecord } from "@/types/domain";

type ModelPricingSeed = {
  id: string;
  label: string;
  inputPer1M: string;
  cachedInputPer1M: string;
  outputPer1M: string;
};

type ModelPricing = {
  inputPer1M: string;
  cachedInputPer1M: string;
  outputPer1M: string;
};

type UsageProfile = {
  runCount: number;
  comparedCount: number;
  embeddingInputPerCompared: number;
  reasoningInputPerCompared: number;
  reasoningCachedPerCompared: number;
  reasoningOutputPerCompared: number;
};

const MODEL_PRICING_SEEDS: ModelPricingSeed[] = [
  {
    id: "chatgpt54",
    label: "ChatGPT 5.4",
    inputPer1M: "2.50",
    cachedInputPer1M: "0.25",
    outputPer1M: "15.00",
  },
  {
    id: "claude-opus47",
    label: "Claude Opus 4.7",
    inputPer1M: "5.00",
    cachedInputPer1M: "0.50",
    outputPer1M: "25.00",
  },
  {
    id: "kimi-27",
    label: "Kimi 2.7",
    inputPer1M: "",
    cachedInputPer1M: "",
    outputPer1M: "",
  },
  {
    id: "minimax",
    label: "MiniMax",
    inputPer1M: "0.30",
    cachedInputPer1M: "0.06",
    outputPer1M: "1.20",
  },
  {
    id: "deepseek4",
    label: "DeepSeek 4",
    inputPer1M: "0.435",
    cachedInputPer1M: "0.003625",
    outputPer1M: "0.87",
  },
  {
    id: "gemini-flash",
    label: "Gemini Flash",
    inputPer1M: "0.30",
    cachedInputPer1M: "0.03",
    outputPer1M: "2.50",
  },
  {
    id: "gemini-pro",
    label: "Gemini Pro",
    inputPer1M: "1.25",
    cachedInputPer1M: "0.125",
    outputPer1M: "10.00",
  },
];

const REPORT_COUNTS = [10, 100, 1_000, 10_000, 100_000, 1_000_000];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNonNegativeNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatUsd(value: number): string {
  if (value >= 1000) {
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  if (value >= 1) {
    return `$${value.toFixed(2)}`;
  }
  if (value >= 0.01) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(6)}`;
}

function computeUsageProfile(logs: AiLogRecord[]): UsageProfile | null {
  let runCount = 0;
  let comparedCount = 0;
  let embeddingInputTotal = 0;
  let reasoningInputTotal = 0;
  let reasoningCachedTotal = 0;
  let reasoningOutputTotal = 0;

  for (const log of logs) {
    if (log.step !== "process_complete") {
      continue;
    }

    const output = asRecord(log.output);
    const usageTokens = asRecord(output?.usage_tokens);
    if (!usageTokens) {
      continue;
    }

    const comparedFromProjection = asNumber(asRecord(output?.comparison_cost_projection)?.compared_count_in_this_run);
    const comparedFromScore = asNumber(output?.scoredCount);
    const compared = comparedFromProjection ?? comparedFromScore ?? 0;

    const embeddingInput = asNumber(usageTokens.embedding_input_tokens) ?? 0;
    const reasoningInput = asNumber(usageTokens.reasoning_input_tokens) ?? 0;
    const reasoningCached = asNumber(usageTokens.reasoning_cached_input_tokens) ?? 0;
    const reasoningOutput = asNumber(usageTokens.reasoning_output_tokens) ?? 0;

    if (compared <= 0) {
      continue;
    }

    runCount += 1;
    comparedCount += compared;
    embeddingInputTotal += embeddingInput;
    reasoningInputTotal += reasoningInput;
    reasoningCachedTotal += reasoningCached;
    reasoningOutputTotal += reasoningOutput;
  }

  if (!runCount || !comparedCount) {
    return null;
  }

  return {
    runCount,
    comparedCount,
    embeddingInputPerCompared: embeddingInputTotal / comparedCount,
    reasoningInputPerCompared: reasoningInputTotal / comparedCount,
    reasoningCachedPerCompared: reasoningCachedTotal / comparedCount,
    reasoningOutputPerCompared: reasoningOutputTotal / comparedCount,
  };
}

function estimateCostForReportCount(
  profile: UsageProfile,
  pricing: ModelPricing,
  reportCount: number,
): number | null {
  const inputPer1M = toNonNegativeNumber(pricing.inputPer1M);
  const outputPer1M = toNonNegativeNumber(pricing.outputPer1M);
  if (inputPer1M === null || outputPer1M === null) {
    return null;
  }

  const cachedInputPer1M = toNonNegativeNumber(pricing.cachedInputPer1M) ?? inputPer1M;
  const million = 1_000_000;
  const billableReasoningInputPerCompared = Math.max(0, profile.reasoningInputPerCompared - profile.reasoningCachedPerCompared);
  const billableInputPerCompared = profile.embeddingInputPerCompared + billableReasoningInputPerCompared;

  const costPerCompared =
    (billableInputPerCompared / million) * inputPer1M +
    (profile.reasoningCachedPerCompared / million) * cachedInputPer1M +
    (profile.reasoningOutputPerCompared / million) * outputPer1M;

  return costPerCompared * reportCount;
}

export default function CostTableScreen() {
  const { user } = useAuth();
  const { logs, loading } = useUserAiLogs(user?.uid);
  const [pricingByModel, setPricingByModel] = useState<Record<string, ModelPricing>>(() =>
    Object.fromEntries(
      MODEL_PRICING_SEEDS.map((seed) => [
        seed.id,
        {
          inputPer1M: seed.inputPer1M,
          cachedInputPer1M: seed.cachedInputPer1M,
          outputPer1M: seed.outputPer1M,
        },
      ]),
    ),
  );

  const profile = useMemo(() => computeUsageProfile(logs), [logs]);

  function updatePricing(modelId: string, field: keyof ModelPricing, next: string) {
    setPricingByModel((current) => ({
      ...current,
      [modelId]: {
        ...current[modelId],
        [field]: next,
      },
    }));
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.kicker}>AI Cost Planner</Text>
        <Text style={styles.title}>Model vs Report Count</Text>
        <Text style={styles.body}>
          This table projects total cost by model and number of compared reports, using average token usage from your own completed runs.
        </Text>
      </View>

      {loading ? <Text style={styles.info}>Loading log data...</Text> : null}

      {!loading && !profile ? (
        <EmptyState
          title="No completed runs with usage yet"
          body="Run matching at least once after the cost-tracking update, then reopen this page to see model comparison totals."
        />
      ) : null}

      {profile ? (
        <View style={styles.baselineCard}>
          <Text style={styles.sectionTitle}>Average Token Baseline</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>Runs used: {profile.runCount}</Text>
            <Text style={styles.meta}>Compared reports: {profile.comparedCount.toLocaleString()}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>Embed/report: {profile.embeddingInputPerCompared.toFixed(1)}</Text>
            <Text style={styles.meta}>Input/report: {profile.reasoningInputPerCompared.toFixed(1)}</Text>
            <Text style={styles.meta}>Cached/report: {profile.reasoningCachedPerCompared.toFixed(1)}</Text>
            <Text style={styles.meta}>Output/report: {profile.reasoningOutputPerCompared.toFixed(1)}</Text>
          </View>
        </View>
      ) : null}

      {profile ? (
        <View style={styles.tableCard}>
          <Text style={styles.sectionTitle}>Cost Table (USD)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScrollContent}>
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.modelCol]}>Model</Text>
                {REPORT_COUNTS.map((count) => (
                  <Text key={count} style={[styles.tableHeaderCell, styles.valueCol]}>{count.toLocaleString()}</Text>
                ))}
              </View>
              {MODEL_PRICING_SEEDS.map((seed) => (
                <View key={seed.id} style={styles.tableRow}>
                  <Text style={[styles.tableModelCell, styles.modelCol]}>{seed.label}</Text>
                  {REPORT_COUNTS.map((count) => {
                    const estimate = estimateCostForReportCount(profile, pricingByModel[seed.id], count);
                    return (
                      <Text key={count} style={[styles.tableValueCell, styles.valueCol]}>
                        {estimate === null ? "Set price" : formatUsd(estimate)}
                      </Text>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.pricingCard}>
        <Text style={styles.sectionTitle}>Pricing Inputs (USD per 1M tokens)</Text>
        <Text style={styles.helpText}>Edit rates whenever provider pricing changes. Empty fields are treated as not set.</Text>
        <View style={styles.modelPricingGrid}>
          {MODEL_PRICING_SEEDS.map((seed) => {
            const pricing = pricingByModel[seed.id];
            return (
              <View key={seed.id} style={styles.modelPricingItem}>
                <Text style={styles.modelName}>{seed.label}</Text>
                <View style={styles.inputGrid}>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>Input</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={pricing.inputPer1M}
                      onChangeText={(text) => updatePricing(seed.id, "inputPer1M", text)}
                      placeholder="e.g. 1.25"
                      placeholderTextColor={colors.outline}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>Cached Input</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={pricing.cachedInputPer1M}
                      onChangeText={(text) => updatePricing(seed.id, "cachedInputPer1M", text)}
                      placeholder="e.g. 0.125"
                      placeholderTextColor={colors.outline}
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>Output</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={pricing.outputPer1M}
                      onChangeText={(text) => updatePricing(seed.id, "outputPer1M", text)}
                      placeholder="e.g. 10"
                      placeholderTextColor={colors.outline}
                      style={styles.input}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        <Button
          title="Reset Defaults"
          variant="ghost"
          onPress={() =>
            setPricingByModel(
              Object.fromEntries(
                MODEL_PRICING_SEEDS.map((seed) => [
                  seed.id,
                  {
                    inputPer1M: seed.inputPer1M,
                    cachedInputPer1M: seed.cachedInputPer1M,
                    outputPer1M: seed.outputPer1M,
                  },
                ]),
              ),
            )
          }
        />
      </View>

      <View style={styles.sourceCard}>
        <Text style={styles.sectionTitle}>Default Price Notes</Text>
        <Text style={styles.helpText}>
          Defaults come from current provider docs where available. Some models and tiers vary by region, prompt size, or temporary discounts, so keep these values updated.
        </Text>
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
  },
  info: {
    color: colors.outline,
    fontWeight: "700",
  },
  baselineCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 18,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  meta: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "800",
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  tableScrollContent: {
    paddingBottom: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.primary,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  modelCol: {
    width: 180,
  },
  valueCol: {
    width: 130,
  },
  tableHeaderCell: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tableModelCell: {
    color: colors.ink,
    fontWeight: "800",
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  tableValueCell: {
    color: colors.ink,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  pricingCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  helpText: {
    color: colors.muted,
    lineHeight: 20,
  },
  modelPricingGrid: {
    gap: 10,
  },
  modelPricingItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    backgroundColor: colors.surfaceMuted,
  },
  modelName: {
    color: colors.primary,
    fontWeight: "900",
  },
  inputGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inputWrap: {
    flexGrow: 1,
    flexBasis: 150,
    gap: 6,
  },
  inputLabel: {
    color: colors.outline,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    color: colors.ink,
    fontSize: 14,
  },
  sourceCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
});
