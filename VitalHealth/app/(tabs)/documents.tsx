import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../../context/ThemeContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type ReportCategory =
  | "Lab"
  | "ECG"
  | "Prescription"
  | "Scan"
  | "Discharge"
  | "Other";

interface Document {
  id: string;
  title: string;
  date: string;
  category: ReportCategory;
  doctor?: string;
}

interface CategoryStyle {
  icon: keyof typeof Ionicons.glyphMap;
  lightBg: string;
  darkBg: string;
  lightIcon: string;
  darkIcon: string;
  lightBadge: string;
  darkBadge: string;
  lightBadgeText: string;
  darkBadgeText: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { label: string; value: ReportCategory | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Lab Reports", value: "Lab" },
  { label: "Prescriptions", value: "Prescription" },
  { label: "Scans", value: "Scan" },
  { label: "ECG / Cardio", value: "ECG" },
  { label: "Discharge", value: "Discharge" },
  { label: "Other", value: "Other" },
];

const UPLOAD_TYPES: {
  label: string;
  value: ReportCategory;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}[] = [
  {
    label: "Lab Report",
    value: "Lab",
    icon: "flask-outline",
    description: "Blood tests, urine analysis, cultures",
  },
  {
    label: "Prescription",
    value: "Prescription",
    icon: "medkit-outline",
    description: "Doctor prescriptions & medication notes",
  },
  {
    label: "Scan / Imaging",
    value: "Scan",
    icon: "scan-outline",
    description: "X-Ray, MRI, CT scan, ultrasound",
  },
  {
    label: "ECG / Cardio",
    value: "ECG",
    icon: "pulse-outline",
    description: "ECG, echocardiogram, Holter reports",
  },
  {
    label: "Discharge Summary",
    value: "Discharge",
    icon: "document-text-outline",
    description: "Hospital discharge & operative notes",
  },
  {
    label: "Other",
    value: "Other",
    icon: "attach-outline",
    description: "Referrals, insurance, miscellaneous",
  },
];

const CATEGORY_STYLES: Record<ReportCategory, CategoryStyle> = {
  Lab: {
    icon: "flask-outline",
    lightBg: "#dbeafe",
    darkBg: "#1a2e3d",
    lightIcon: "#2563eb",
    darkIcon: "#5db4e8",
    lightBadge: "#dbeafe",
    darkBadge: "#1a2e3d",
    lightBadgeText: "#1d4ed8",
    darkBadgeText: "#5db4e8",
  },
  ECG: {
    icon: "pulse-outline",
    lightBg: "#fee2e2",
    darkBg: "#2d1a1a",
    lightIcon: "#dc2626",
    darkIcon: "#e06060",
    lightBadge: "#fee2e2",
    darkBadge: "#2d1a1a",
    lightBadgeText: "#b91c1c",
    darkBadgeText: "#e06060",
  },
  Prescription: {
    icon: "medkit-outline",
    lightBg: "#dcfce7",
    darkBg: "#1a2d1a",
    lightIcon: "#16a34a",
    darkIcon: "#56c656",
    lightBadge: "#dcfce7",
    darkBadge: "#1a2d1a",
    lightBadgeText: "#15803d",
    darkBadgeText: "#56c656",
  },
  Scan: {
    icon: "scan-outline",
    lightBg: "#fef3c7",
    darkBg: "#2d2418",
    lightIcon: "#d97706",
    darkIcon: "#e0a23d",
    lightBadge: "#fef3c7",
    darkBadge: "#2d2418",
    lightBadgeText: "#b45309",
    darkBadgeText: "#e0a23d",
  },
  Discharge: {
    icon: "document-text-outline",
    lightBg: "#f3e8ff",
    darkBg: "#2a1a2e",
    lightIcon: "#9333ea",
    darkIcon: "#b86ed9",
    lightBadge: "#f3e8ff",
    darkBadge: "#2a1a2e",
    lightBadgeText: "#7e22ce",
    darkBadgeText: "#b86ed9",
  },
  Other: {
    icon: "attach-outline",
    lightBg: "#f1f5f9",
    darkBg: "#1e2530",
    lightIcon: "#64748b",
    darkIcon: "#8b949e",
    lightBadge: "#f1f5f9",
    darkBadge: "#1e2530",
    lightBadgeText: "#475569",
    darkBadgeText: "#8b949e",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocumentsScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const colors = isDark
    ? {
        bg: "#0d1117",
        card: "#161b22",
        border: "#21262d",
        text: "#c9d1d9",
        sub: "#484f58",
        muted: "#30363d",
        accent: "#1d6fa4",
        accentText: "#5db4e8",
        headerBg: "#0d1117",
        filterActive: "#1d6fa4",
        filterActiveBorder: "#2788c0",
        filterActiveText: "#e0f0ff",
        filterInactive: "#161b22",
        filterInactiveBorder: "#21262d",
        filterInactiveText: "#8b949e",
        statsChip: "#161b22",
        statsChipBorder: "#21262d",
        statsText: "#8b949e",
        statsValue: "#c9d1d9",
        sectionLabel: "#4b5563",
        modalBg: "#161b22",
        modalOverlay: "rgba(0,0,0,0.7)",
        uploadRow: "#1c2128",
        uploadRowBorder: "#21262d",
        emptyIcon: "#21262d",
        emptyIconFg: "#30363d",
      }
    : {
        bg: "#f6f8fa",
        card: "#ffffff",
        border: "#e5e7eb",
        text: "#111827",
        sub: "#9ca3af",
        muted: "#e5e7eb",
        accent: "#2563eb",
        accentText: "#2563eb",
        headerBg: "#f6f8fa",
        filterActive: "#2563eb",
        filterActiveBorder: "#1d4ed8",
        filterActiveText: "#ffffff",
        filterInactive: "#ffffff",
        filterInactiveBorder: "#e5e7eb",
        filterInactiveText: "#6b7280",
        statsChip: "#ffffff",
        statsChipBorder: "#e5e7eb",
        statsText: "#6b7280",
        statsValue: "#111827",
        sectionLabel: "#9ca3af",
        modalBg: "#ffffff",
        modalOverlay: "rgba(0,0,0,0.4)",
        uploadRow: "#f9fafb",
        uploadRowBorder: "#f3f4f6",
        emptyIcon: "#f3f4f6",
        emptyIconFg: "#d1d5db",
      };

  // ─── State ───────────────────────────────────────────────────────────────────

  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeFilter, setActiveFilter] = useState<ReportCategory | "All">("All");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [reportName, setReportName] = useState("");
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);
  const [pickedFileUri, setPickedFileUri] = useState<string | null>(null);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const filtered =
    activeFilter === "All"
      ? documents
      : documents.filter((d) => d.category === activeFilter);

  const thisMonth = documents.filter((d) => {
    const now = new Date();
    const monthStr = now.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    return d.date.includes(monthStr);
  }).length;

  const lastDoc = documents[0]?.date ?? "—";

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const resetModalState = () => {
    setSelectedCategory(null);
    setReportName("");
    setPickedFileName(null);
    setPickedFileUri(null);
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    resetModalState();
  };

  const handleCategorySelect = (category: ReportCategory) => {
    setSelectedCategory(category);
    setReportName("");
    setPickedFileName(null);
    setPickedFileUri(null);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        setPickedFileName(file.name);
        setPickedFileUri(file.uri);
      }
    } catch {
      Alert.alert("Error", "Could not open the file picker. Please try again.");
    }
  };

  const handleConfirmUpload = () => {
    if (!reportName.trim()) {
      Alert.alert("Name required", "Please enter a name for this report.");
      return;
    }
    if (!pickedFileUri) {
      Alert.alert("File required", "Please select a file to upload.");
      return;
    }
    const newDoc: Document = {
      id: Date.now().toString(),
      title: reportName.trim(),
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      category: selectedCategory!,
      doctor: "Uploaded by you",
    };
    setDocuments((prev) => [newDoc, ...prev]);
    handleCloseModal();
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const renderDocument = ({ item }: { item: Document }) => {
    const style = CATEGORY_STYLES[item.category];
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <View style={[styles.iconBox, { backgroundColor: isDark ? style.darkBg : style.lightBg }]}>
          <Ionicons name={style.icon} size={20} color={isDark ? style.darkIcon : style.lightIcon} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.sub }]}>
            {item.date}{item.doctor ? ` · ${item.doctor}` : ""}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isDark ? style.darkBadge : style.lightBadge }]}>
          <Text style={[styles.badgeText, { color: isDark ? style.darkBadgeText : style.lightBadgeText }]}>
            {item.category}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.muted} />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.emptyIcon }]}>
        <Ionicons name="documents-outline" size={36} color={colors.emptyIconFg} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No documents yet</Text>
      <Text style={[styles.emptyDesc, { color: colors.sub }]}>
        {activeFilter === "All"
          ? "Tap the + button to add your first medical document."
          : `No ${activeFilter} documents added yet.`}
      </Text>
    </View>
  );

  const renderCategoryStep = () => (
    <>
      <Text style={[styles.modalTitle, { color: colors.text }]}>Add Document</Text>
      <Text style={[styles.modalSub, { color: colors.sub }]}>
        Select the type of report to upload
      </Text>
      {UPLOAD_TYPES.map((type) => {
        const catStyle = CATEGORY_STYLES[type.value];
        return (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.uploadRow,
              { backgroundColor: colors.uploadRow, borderBottomColor: colors.uploadRowBorder },
            ]}
            onPress={() => handleCategorySelect(type.value)}
            activeOpacity={0.7}
          >
            <View style={[styles.uploadIcon, { backgroundColor: isDark ? catStyle.darkBg : catStyle.lightBg }]}>
              <Ionicons name={type.icon} size={18} color={isDark ? catStyle.darkIcon : catStyle.lightIcon} />
            </View>
            <View style={styles.uploadInfo}>
              <Text style={[styles.uploadLabel, { color: colors.text }]}>{type.label}</Text>
              <Text style={[styles.uploadDesc, { color: colors.sub }]}>{type.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.sub} />
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity
        style={[styles.cancelBtn, { borderColor: colors.border }]}
        onPress={handleCloseModal}
      >
        <Text style={[styles.cancelText, { color: colors.sub }]}>Cancel</Text>
      </TouchableOpacity>
    </>
  );

  const renderUploadStep = () => {
    const catStyle = CATEGORY_STYLES[selectedCategory!];
    const canSubmit = reportName.trim().length > 0 && pickedFileName !== null;
    return (
      <>
        <View style={styles.modalTitleRow}>
          <TouchableOpacity onPress={() => setSelectedCategory(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={18} color={colors.sub} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>
            {UPLOAD_TYPES.find((t) => t.value === selectedCategory)?.label}
          </Text>
        </View>
        <Text style={[styles.modalSub, { color: colors.sub, marginTop: 4 }]}>
          Enter a name and attach the file
        </Text>

        {/* Report name */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.sub }]}>Report name</Text>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: colors.uploadRow, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="e.g. Blood Test – Jan 2026"
            placeholderTextColor={colors.sub}
            value={reportName}
            onChangeText={setReportName}
            returnKeyType="done"
          />
        </View>

        {/* File picker */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.sub }]}>Attach file</Text>
          <TouchableOpacity
            style={[
              styles.filePicker,
              {
                backgroundColor: colors.uploadRow,
                borderColor: pickedFileName ? colors.accent : colors.border,
                borderStyle: pickedFileName ? "solid" : "dashed",
              },
            ]}
            onPress={handlePickFile}
            activeOpacity={0.7}
          >
            {pickedFileName ? (
              <>
                <View style={[styles.fileIconBox, { backgroundColor: isDark ? catStyle.darkBg : catStyle.lightBg }]}>
                  <Ionicons
                    name="document-attach-outline"
                    size={18}
                    color={isDark ? catStyle.darkIcon : catStyle.lightIcon}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fileNameText, { color: colors.text }]} numberOfLines={1}>
                    {pickedFileName}
                  </Text>
                  <Text style={[styles.fileTapText, { color: colors.sub }]}>Tap to change file</Text>
                </View>
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
              </>
            ) : (
              <View style={styles.filePickerEmpty}>
                <Ionicons name="cloud-upload-outline" size={26} color={colors.sub} />
                <Text style={[styles.filePickerText, { color: colors.sub }]}>Tap to browse files</Text>
                <Text style={[styles.filePickerHint, { color: colors.muted }]}>PDF or Image</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Confirm */}
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: canSubmit ? colors.accent : colors.muted }]}
          onPress={handleConfirmUpload}
          activeOpacity={canSubmit ? 0.8 : 1}
        >
          <Ionicons name="checkmark" size={18} color={canSubmit ? "#fff" : colors.sub} />
          <Text style={[styles.confirmText, { color: canSubmit ? "#fff" : colors.sub }]}>
            Add Document
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelBtn, { borderColor: colors.border }]}
          onPress={handleCloseModal}
        >
          <Text style={[styles.cancelText, { color: colors.sub }]}>Cancel</Text>
        </TouchableOpacity>
      </>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={[styles.headerSuper, { color: colors.sectionLabel }]}>HEALTH RECORDS</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Documents</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <View style={[styles.statsChip, { backgroundColor: colors.statsChip, borderColor: colors.statsChipBorder }]}>
            <Text style={[styles.statsLabel, { color: colors.statsText }]}>Total </Text>
            <Text style={[styles.statsValue, { color: colors.statsValue }]}>{documents.length}</Text>
          </View>
          <View style={[styles.statsChip, { backgroundColor: colors.statsChip, borderColor: colors.statsChipBorder }]}>
            <Text style={[styles.statsLabel, { color: colors.statsText }]}>This month </Text>
            <Text style={[styles.statsValue, { color: colors.statsValue }]}>{thisMonth}</Text>
          </View>
          <View style={[styles.statsChip, { backgroundColor: colors.statsChip, borderColor: colors.statsChipBorder }]}>
            <Text style={[styles.statsLabel, { color: colors.statsText }]}>Last: </Text>
            <Text style={[styles.statsValue, { color: colors.statsValue }]}>{lastDoc}</Text>
          </View>
        </ScrollView>
      </View>

      {/* Filter pills */}
      <View>
        <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>FILTER BY TYPE</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeFilter === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setActiveFilter(cat.value as ReportCategory | "All")}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive ? colors.filterActive : colors.filterInactive,
                    borderColor: isActive ? colors.filterActiveBorder : colors.filterInactiveBorder,
                  },
                ]}
              >
                <Text style={[styles.filterText, { color: isActive ? colors.filterActiveText : colors.filterInactiveText }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Section label */}
      <Text style={[styles.sectionLabel, { color: colors.sectionLabel, marginTop: 4 }]}>
        {activeFilter === "All" ? "ALL DOCUMENTS" : activeFilter.toUpperCase()}
        {"  "}
        <Text style={{ fontWeight: "400" }}>({filtered.length})</Text>
      </Text>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderDocument}
        contentContainerStyle={[
          styles.listContent,
          filtered.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => setShowUploadModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
            activeOpacity={1}
            onPress={handleCloseModal}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBg }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            {selectedCategory === null ? renderCategoryStep() : renderUploadStep()}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerSuper: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "600",
    marginBottom: 14,
  },
  statsScroll: { flexDirection: "row" },
  statsChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 0.5,
    marginRight: 8,
  },
  statsLabel: { fontSize: 12 },
  statsValue: { fontSize: 12, fontWeight: "600" },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterScroll: { paddingHorizontal: 20, gap: 8 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  filterText: { fontSize: 12, fontWeight: "500" },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 10,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 0.5,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: "500" },
  cardMeta: { fontSize: 12, marginTop: 2 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { fontSize: 10, fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 4,
    gap: 10,
  },
  backBtn: { padding: 4 },
  uploadRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    gap: 14,
  },
  uploadIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadInfo: { flex: 1 },
  uploadLabel: { fontSize: 14, fontWeight: "500" },
  uploadDesc: { fontSize: 12, marginTop: 1 },
  cancelBtn: {
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 0.5,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "500" },
  inputSection: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 0.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  filePicker: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filePickerEmpty: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  fileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fileNameText: { fontSize: 13, fontWeight: "500" },
  fileTapText: { fontSize: 11, marginTop: 2 },
  filePickerText: { fontSize: 14, fontWeight: "500" },
  filePickerHint: { fontSize: 12 },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "600",
  },
});