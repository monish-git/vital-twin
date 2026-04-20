// app/(tabs)/ai-health.tsx
// AI Health Page with ON-DEVICE Chunking and Embedding

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "../../context/ThemeContext";
import { colors } from "../../theme/colors";
import Header from "../components/Header";

// Import our on-device services
import {
  EmbeddedChunk,
  loadChunks,
  loadDocuments,
  pickDocument,
  pickImage,
  processDocument,
  ProcessingProgress,
  saveChunks,
  saveDocuments
} from "../../services/documentProcessing";
import { generateEmbedding, getModelInfo, retrieveTopKChunks } from "../../services/embeddingService";

// ─── Constants ───────────────────────────────────────────────────────────────

const PROFILE_ID = "profile-1";
const KEY_SERVER_IP = "@hai_server_ip";
const KEY_SERVER_PORT = "@hai_server_port";
const DEFAULT_PORT = "8000";
const TOP_K = 5;

// ─── Utility Functions ───────────────────────────────────────────────────────

const buildUrl = (ip: string, port: string) =>
  `http://${ip.trim().replace(/^https?:\/\//, "")}:${(port || "8000").trim()}`;

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

// ─── Types ───────────────────────────────────────────────────────────────────

type Message = {
  id: string;
  text: string;
  sender: "user" | "ai" | "system";
  timestamp: Date;
};

type Doc = {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  chunkCount: number;
  uploadedAt: number;
};

// ─── Server Config Modal ─────────────────────────────────────────────────────

function ServerConfigModal({
  visible,
  ip,
  port,
  onSave,
  onClose,
  c,
}: {
  visible: boolean;
  ip: string;
  port: string;
  onSave: (ip: string, port: string) => void;
  onClose: () => void;
  c: any;
}) {
  const [localIp, setLocalIp] = useState(ip);
  const [localPort, setLocalPort] = useState(port);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    setLocalIp(ip);
    setLocalPort(port);
    setResult(null);
  }, [ip, port, visible]);

  const test = async () => {
    setTesting(true);
    setResult(null);
    try {
      const r = await fetch(`${buildUrl(localIp, localPort)}/health`);
      setResult(r.ok ? "ok" : "fail");
    } catch {
      setResult("fail");
    } finally {
      setTesting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>⚙️ Server Settings</Text>
          <Text style={[styles.modalSub, { color: c.sub }]}>
            Enter your laptop's LAN IP address for LLM generation.
            {"\n"}Chunking and embedding happen on this device!
          </Text>

          <Text style={[styles.fieldLabel, { color: c.sub }]}>Laptop IP Address</Text>
          <View style={[styles.fieldRow, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Text style={styles.fieldIcon}>🌐</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.text }]}
              value={localIp}
              onChangeText={setLocalIp}
              placeholder="e.g. 192.168.1.42"
              placeholderTextColor={c.sub}
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: c.sub }]}>Port</Text>
          <View style={[styles.fieldRow, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Text style={styles.fieldIcon}>🔌</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.text }]}
              value={localPort}
              onChangeText={setLocalPort}
              placeholder="8000"
              placeholderTextColor={c.sub}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={[styles.testBtn, { backgroundColor: c.accent }, (testing || !localIp.trim()) && { opacity: 0.5 }]}
            onPress={test}
            disabled={testing || !localIp.trim()}
          >
            {testing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.testBtnTxt}>🔍 Test Connection</Text>
            )}
          </TouchableOpacity>

          {result === "ok" && (
            <Text style={[styles.resultTxt, { color: "#10b981" }]}>
              ✅ Server reachable!
            </Text>
          )}
          {result === "fail" && (
            <Text style={[styles.resultTxt, { color: "#ef4444" }]}>
              ❌ Cannot connect — check IP and WiFi
            </Text>
          )}

          <View style={{ flexDirection: "row", marginTop: 6 }}>
            <TouchableOpacity
              style={[styles.modalBtn, { marginRight: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg }]}
              onPress={onClose}
            >
              <Text style={[styles.modalBtnTxt, { color: c.sub }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalBtn,
                { backgroundColor: c.accent },
                !localIp.trim() && { opacity: 0.4 },
              ]}
              onPress={() => onSave(localIp, localPort)}
              disabled={!localIp.trim()}
            >
              <Text style={[styles.modalBtnTxt, { color: "#fff" }]}>Save ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Document Viewer Modal ────────────────────────────────────────────────────

function DocViewerModal({
  doc,
  chunks,
  onClose,
  c,
}: {
  doc: Doc | null;
  chunks: EmbeddedChunk[];
  onClose: () => void;
  c: any;
}) {
  if (!doc) return null;
  const docChunks = chunks.filter((ch) => ch.metadata?.docId === doc.id);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={[styles.docHeader, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.docHeaderTitle, { color: c.text }]} numberOfLines={1}>
              {doc.name}
            </Text>
            <Text style={[styles.docHeaderSub, { color: c.sub }]}>
              {doc.type} · {docChunks.length} chunks · {fmtDate(doc.uploadedAt)}
            </Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <Text style={[styles.iconBtnTxt, { color: "#ef4444" }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 14 }}>
          <Text style={[styles.sectionHead, { marginTop: 10, marginBottom: 8, color: c.text }]}>
            📄 Extracted Text (On-Device)
          </Text>
          {docChunks.length === 0 ? (
            <Text style={[styles.emptyTxt, { color: c.sub }]}>No text extracted for this document.</Text>
          ) : (
            docChunks.map((ch, i) => (
              <View key={i} style={[styles.chunkCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.chunkIdx, { color: c.accent }]}>Chunk {i + 1}</Text>
                <Text style={[styles.chunkTxt, { color: c.sub }]}>{ch.text}</Text>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── All Chunks Viewer Modal ────────────────────────────────────────────────────

function AllChunksModal({
  chunks,
  docs,
  visible,
  onClose,
  c,
}: {
  chunks: EmbeddedChunk[];
  docs: Doc[];
  visible: boolean;
  onClose: () => void;
  c: any;
}) {
  // Print all chunks to console for debugging
  const printChunksToConsole = () => {
    console.log('========== ALL CHUNKS DEBUG ==========');
    console.log(`Total chunks: ${chunks.length}`);
    console.log(`Total documents: ${docs.length}`);
    console.log('');
    
    docs.forEach(doc => {
      const docChunks = chunks.filter(ch => ch.metadata?.docId === doc.id);
      console.log(`Document: ${doc.name} (${doc.id})`);
      console.log(`  Type: ${doc.type}, Chunks: ${docChunks.length}, Uploaded: ${fmtDate(doc.uploadedAt)}`);
      
      docChunks.forEach((ch, i) => {
        console.log(`  Chunk ${i + 1} [${ch.id}]:`);
        console.log(`  "${ch.text.substring(0, 100)}${ch.text.length > 100 ? '...' : ''}"`);
        console.log('');
      });
    });
    console.log('========== END DEBUG ==========');
  };

  // Show console on mount if modal opens
  useEffect(() => {
    if (visible && chunks.length > 0) {
      printChunksToConsole();
    }
  }, [visible]);

  if (!visible) return null;

  // Group chunks by document
  const chunksByDoc = docs.map(doc => ({
    doc,
    chunks: chunks.filter(ch => ch.metadata?.docId === doc.id)
  }));

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={[styles.docHeader, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.docHeaderTitle, { color: c.text }]}>
              📋 All Chunks
            </Text>
            <Text style={[styles.docHeaderSub, { color: c.sub }]}>
              {chunks.length} total chunks from {docs.length} documents
            </Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose}>
            <Text style={[styles.iconBtnTxt, { color: "#ef4444" }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 14 }}>
          {chunks.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={[styles.emptyTxt, { color: c.sub, fontSize: 16 }]}>
                ⚠️ No documents uploaded yet
              </Text>
              <Text style={[styles.emptyTxt, { color: c.sub, marginTop: 10 }]}>
                Upload a document to enable RAG
              </Text>
            </View>
          ) : (
            chunksByDoc.map(({ doc, chunks: docChunks }) => (
              <View key={doc.id} style={{ marginBottom: 16 }}>
                <View style={[styles.docSectionHeader, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[styles.docSectionTitle, { color: c.text }]} numberOfLines={1}>
                    📄 {doc.name}
                  </Text>
                  <Text style={[styles.docSectionSub, { color: c.sub }]}>
                    {docChunks.length} chunks · {doc.type}
                  </Text>
                </View>
                
                {docChunks.map((ch, i) => (
                  <View key={ch.id} style={[styles.chunkCard, { backgroundColor: c.bg, borderColor: c.border }]}>
                    <Text style={[styles.chunkIdx, { color: c.accent }]}>
                      Chunk {i + 1}
                    </Text>
                    <Text style={[styles.chunkTxt, { color: c.sub }]}>{ch.text}</Text>
                  </View>
                ))}
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Processing Modal ─────────────────────────────────────────────────────────

function ProcessingModal({
  visible,
  progress,
  onCancel,
  c,
}: {
  visible: boolean;
  progress: ProcessingProgress | null;
  onCancel: () => void;
  c: any;
}) {
  if (!visible || !progress) return null;

  const getProgressColor = () => {
    switch (progress.stage) {
      case 'complete': return "#10b981";
      case 'error': return "#ef4444";
      default: return c.accent;
    }
  };

  const getStageIcon = () => {
    switch (progress.stage) {
      case 'extracting': return '📝';
      case 'chunking': return '✂️';
      case 'embedding': return '🧠';
      case 'storing': return '💾';
      case 'complete': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.processingOverlay}>
        <View style={[styles.processingCard, { backgroundColor: c.card }]}>
          <ActivityIndicator size="large" color={c.accent} />
          <Text style={[styles.processingTitle, { color: c.text }]}>{getStageIcon()} Processing Document</Text>
          <Text style={[styles.processingMessage, { color: c.sub }]}>{progress.message}</Text>
          
          {progress.stage !== 'complete' && progress.stage !== 'error' && (
            <View style={[styles.progressBarContainer, { backgroundColor: c.border }]}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${progress.progress}%`, backgroundColor: getProgressColor() }
                ]} 
              />
            </View>
          )}
          
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={[styles.cancelBtnTxt, { color: "#ef4444" }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AIHealthScreen() {
  const router = useRouter();
  const { symptom, source } = useLocalSearchParams<{
    symptom?: string;
    source?: string;
  }>();
  const { theme } = useTheme();
  const c = colors[theme];

  // Server state
  const [serverIp, setServerIp] = useState("");
  const [serverPort, setServerPort] = useState(DEFAULT_PORT);
  const [connected, setConnected] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  // Document state
  const [docs, setDocs] = useState<Doc[]>([]);
  const [allChunks, setAllChunks] = useState<EmbeddedChunk[]>([]);
  const [viewDoc, setViewDoc] = useState<Doc | null>(null);
  const [showAllChunks, setShowAllChunks] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "👋 Documents are processed on-device. Configure server IP (⚙️) for AI responses.",
      sender: "system",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoSent, setAutoSent] = useState(false);

  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const historyRef = useRef<string[]>([]);

  // Auto-send symptom from Symptom Log to AI Health
  useEffect(() => {
  if (!symptom || autoSent || !serverIp) return;

  const userSymptom = Array.isArray(symptom)
    ? symptom[0]
    : symptom;

  if (!userSymptom.trim()) return;

  const timer = setTimeout(async () => {
    await sendMessageWithText(userSymptom);
    setInput(""); // ✅ Ensure input is cleared
    setAutoSent(true);
  }, 800);

  return () => clearTimeout(timer);
}, [symptom, serverIp]);

  // Load saved config and docs on mount
  useEffect(() => {
    (async () => {
      try {
        const ip = (await AsyncStorage.getItem(KEY_SERVER_IP)) || "";
        const port = (await AsyncStorage.getItem(KEY_SERVER_PORT)) || DEFAULT_PORT;
        const d = await loadDocuments();
        const ch = await loadChunks();
        
        setServerIp(ip);
        setServerPort(port);
        setDocs(d);
        setAllChunks(ch);

        // Debug logging
// log('[AIHealth] Loaded config:', { ip, port });

// log('[AIHealth] Loaded documents:', d.length);

// log('[AIHealth] Loaded chunks:', ch.length);

        
        if (d.length > 0) {
          console.log('[AIHealth] Document details:');
          d.forEach((doc: Doc) => {
            const docChunks = ch.filter((chunk: EmbeddedChunk) => chunk.metadata?.docId === doc.id);
            console.log(`  - ${doc.name}: ${docChunks.length} chunks`);
          });
        }

        if (!ip) {
          setShowConfig(true);
        } else {
          // Test connection
          try {
            const r = await fetch(`${buildUrl(ip, port)}/health`);
            setConnected(r.ok);
          } catch {
            setConnected(false);
          }
        }
        
        // Preload the embedding model in background
        setModelLoading(true);
        generateEmbedding("warmup").finally(() => {
          setModelLoading(false);
// log('[AIHealth] Embedding model ready');

        });
      } catch (e) {
        console.error("Error loading config:", e);
      }
    })();
  }, []);

  // Update welcome message when connected
  useEffect(() => {
    if (connected && messages.length === 1 && messages[0].sender === "system") {
      setMessages([
        {
          id: "welcome",
          text: "Hello! I'm your AI health assistant. Documents are processed on-device for privacy. How can I help?",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    }
  }, [connected]);

  // Auto-scroll on new messages
  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // Save server config
  const handleSaveConfig = async (ip: string, port: string) => {
    const cleanIp = ip.trim();
    const cleanPort = (port || DEFAULT_PORT).trim();
    setServerIp(cleanIp);
    setServerPort(cleanPort);
    setShowConfig(false);

    try {
      await AsyncStorage.setItem(KEY_SERVER_IP, cleanIp);
      await AsyncStorage.setItem(KEY_SERVER_PORT, cleanPort);
    } catch {}

    try {
      const r = await fetch(`${buildUrl(cleanIp, cleanPort)}/health`);
      setConnected(r.ok);
    } catch {
      setConnected(false);
    }
  };

  // Helper function to send message with text
  const sendMessageWithText = async (text: string) => {
  if (!text.trim() || loading) return;
  if (!serverIp) {
    setShowConfig(true);
    return;
  }

  const query = text.trim();

  // ✅ Clear the text input after sending
  setInput("");

  const userMsg: Message = {
    id: genId(),
    text: query,
    sender: "user",
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, userMsg]);
  setLoading(true);

    const baseUrl = buildUrl(serverIp, serverPort);
    const history = [...historyRef.current];

    try {
      let aiReply: string;

      if (allChunks.length > 0) {
        const queryEmbedding = await generateEmbedding(query);
        const topResults = retrieveTopKChunks(queryEmbedding, allChunks, TOP_K);
        const topChunks = topResults.map((r) => r.chunk.text);

        const genRes = await fetch(`${baseUrl}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            chunks: topChunks,
            history,
          }),
        });

        if (!genRes.ok) {
          const errorData = await genRes.json().catch(() => ({}));
          throw new Error(errorData.detail || `Generate failed: ${genRes.status}`);
        }

        const genData = await genRes.json();
        aiReply = genData.response;
      } else {
        const genRes = await fetch(`${baseUrl}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            chunks: [],
            history,
          }),
        });

        if (!genRes.ok) {
          const errorData = await genRes.json().catch(() => ({}));
          throw new Error(errorData.detail || `Generate failed: ${genRes.status}`);
        }

        const genData = await genRes.json();
        aiReply = genData.response;
      }

      const aiMsg: Message = {
        id: genId(),
        text: aiReply || "No response from server.",
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      historyRef.current = [...history, query, aiReply].slice(-10);
      setConnected(true);
    } catch (e: any) {
      setConnected(false);
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          text: `❌ ${e.message}`,
          sender: "system",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle document upload - ON-DEVICE PROCESSING
  const handleUpload = async (type: "pdf" | "image") => {
    setUploading(true);
    setProcessingProgress({
      stage: 'extracting',
      progress: 0,
      message: 'Selecting document...',
    });

    try {
      // Pick document
      let document;
      if (type === "image") {
        document = await pickImage();
      } else {
        document = await pickDocument();
      }

      if (!document) {
        setUploading(false);
        setProcessingProgress(null);
        return;
      }

      // Process document on-device
      const { document: newDoc, chunks: newChunks } = await processDocument(document, {
        chunkSize: 500,
        chunkOverlap: 100,
        onProgress: (progress) => {
          setProcessingProgress(progress);
        },
      });

      // Update state
      const updatedDocs = [...docs, newDoc];
      const updatedChunks = [...allChunks, ...newChunks];

      setDocs(updatedDocs);
      setAllChunks(updatedChunks);
      await saveDocuments(updatedDocs);
      await saveChunks(updatedChunks);

      Alert.alert(
        "✅ Document Processed",
        `"${newDoc.name}" - ${newDoc.chunkCount} chunks created and embedded on-device.`
      );
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to process document");
    } finally {
      setUploading(false);
      setProcessingProgress(null);
    }
  };

  // Send message - EMBED QUERY ON-DEVICE, ONLY SEND CHUNKS TO SERVER
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!serverIp) {
      setShowConfig(true);
      return;
    }

    const query = input.trim();
    setInput("");

    const userMsg: Message = {
      id: genId(),
      text: query,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const baseUrl = buildUrl(serverIp, serverPort);
    const history = [...historyRef.current];

    try {
      let aiReply: string;
      let intent = "general";

      if (allChunks.length > 0) {
        // ON-DEVICE: Generate query embedding and retrieve top-K chunks
// log('[AIHealth] Generating embedding on-device...');

        
        const queryEmbedding = await generateEmbedding(query);
        const topResults = retrieveTopKChunks(queryEmbedding, allChunks, TOP_K);
        const topChunks = topResults.map(r => r.chunk.text);

// log(`[AIHealth] Retrieved top ${topChunks.length} chunks on-device`);


        // Send only the TOP K CHUNKS to server for LLM generation (healthbot_v3 API)
        const genRes = await fetch(`${baseUrl}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query, 
            chunks: topChunks,
            history 
          }),
        });

        if (!genRes.ok) {
          const errorData = await genRes.json().catch(() => ({}));
          throw new Error(errorData.detail || `Generate failed: ${genRes.status}`);
        }

        const genData = await genRes.json();
        aiReply = genData.response;
        intent = genData.intent || "general";
      } else {
        // No chunks - use regular query without RAG
        const genRes = await fetch(`${baseUrl}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            query, 
            chunks: [],
            history 
          }),
        });

        if (!genRes.ok) {
          const errorData = await genRes.json().catch(() => ({}));
          throw new Error(errorData.detail || `Generate failed: ${genRes.status}`);
        }

        const genData = await genRes.json();
        aiReply = genData.response;
        intent = genData.intent || "general";
      }

      const aiMsg: Message = {
        id: genId(),
        text: aiReply || "No response from server.",
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      historyRef.current = [...history, query, aiReply].slice(-10);
      setConnected(true);
    } catch (e: any) {
      setConnected(false);
      const errorMsg: Message = {
        id: genId(),
        text: `❌ ${e.message}`,
        sender: "system",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Handle file attachment
  const handleFile = async () => {
    Alert.alert("Upload Document", "Document will be processed on-device", [
      { text: "PDF / Lab Report", onPress: () => handleUpload("pdf") },
      { text: "Prescription Image", onPress: () => handleUpload("image") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Handle voice input
  const handleVoice = () => {
    if (isRecording) {
      setIsRecording(false);
      const simulatedVoiceText = "How can I improve my sleep?";
      setInput(simulatedVoiceText);
      setTimeout(() => sendMessage(), 500);
    } else {
      setIsRecording(true);
      setTimeout(() => {
        setIsRecording(false);
        const simulatedVoiceText = "Tell me about headache remedies";
        setInput(simulatedVoiceText);
      }, 2000);
      Alert.alert("Voice Input", "Recording... Speak clearly");
    }
  };

  // Get bubble colors based on theme
  const getUserBubbleColor = () => theme === "light" ? "#2563eb" : "#3b82f6";
  const getAiBubbleColor = () => theme === "light" ? "#f1f5f9" : "#1e293b";
  const getUserBubbleBorder = () => theme === "light" ? "#1d4ed8" : "#2563eb";
  const getAiBubbleBorder = () => theme === "light" ? "#e2e8f0" : "#334155";

  // Render message
  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";
    const isSystem = item.sender === "system";

    if (isSystem) {
      return (
        <View style={styles.sysRow}>
          <View style={[styles.sysPill, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sysTxt, { color: c.sub }]}>{item.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageRow,
          { justifyContent: isUser ? "flex-end" : "flex-start" },
        ]}
      >
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={{ fontSize: 14 }}>🩺</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
            {
              backgroundColor: isUser ? getUserBubbleColor() : getAiBubbleColor(),
              borderColor: isUser ? getUserBubbleBorder() : getAiBubbleBorder(),
            },
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: isUser ? "#ffffff" : c.text },
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.messageTime,
              { color: isUser ? "#ffffff80" : c.sub },
            ]}
          >
            {fmtTime(item.timestamp.getTime())}
          </Text>
        </View>
      </View>
    );
  };

  const modelInfo = getModelInfo();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} backgroundColor={c.bg} />
      
      {/* Global Header */}
      <Header />

      {/* Header - Fixed padding */}
      <View
  style={[
    styles.header,
    {
      backgroundColor: c.bg,
      borderBottomColor: c.border,
      paddingTop: 110,
    },
  ]}
>
  <View style={styles.headerLeft}>
    <Text style={[styles.headerTitle, { color: c.text }]}>
      🩺 Health AI
    </Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: connected ? "#10b981" : "#ef4444" },
              ]}
            />
            <Text style={[styles.statusLabel, { color: c.sub }]}>
              {connected ? "Connected" : "Not connected"}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setShowConfig(true)}
            style={[styles.urlPill, { borderColor: c.border, backgroundColor: c.card }]}
          >
            <Text
              style={[styles.urlPillTxt, { color: c.accent }]}
              numberOfLines={1}
            >
              {serverIp ? buildUrl(serverIp, serverPort) : "⚙ Set server IP"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowConfig(true)}>
            <Text style={[styles.iconBtnTxt, { color: c.text }]}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* RAG Status Bar - ON-DEVICE */}
      {/* RAG Status Bar - Visible Only When Documents Exist */}
{allChunks.length > 0 && (
  <View
    style={[
      styles.ragBar,
      { backgroundColor: c.card, borderBottomColor: c.border },
    ]}
  >
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center" }}
      onPress={() => setShowAllChunks(true)}
    >
      <Text style={[styles.ragBarTxt, { color: c.accent }]}>
        🔍 On-device RAG · {allChunks.length} chunks
      </Text>
      {modelLoading && (
        <ActivityIndicator
          size="small"
          color={c.accent}
          style={{ marginLeft: 8 }}
        />
      )}
    </TouchableOpacity>

    <TouchableOpacity onPress={() => handleUpload("pdf")}>
      <Text style={[styles.ragBarTxt, { color: c.sub }]}>+ Upload</Text>
    </TouchableOpacity>
  </View>
)}

      {/* Main Content - Fixed Keyboard Avoiding View */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.container, { backgroundColor: c.bg }]}>
          {/* Messages */}
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onTouchStart={Keyboard.dismiss}
            keyboardShouldPersistTaps="handled"
          />

          {/* Input Bar */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: c.card,
                borderTopColor: c.border,
              },
            ]}
          >
            <TouchableOpacity onPress={handleFile} style={styles.iconButton}>
              <Ionicons name="attach" size={24} color={c.sub} />
            </TouchableOpacity>

            <View style={[styles.inputWrapper, { backgroundColor: c.bg, borderColor: c.border }]}>
              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={setInput}
                placeholder="Ask about your health..."
                placeholderTextColor={c.sub}
                style={[styles.input, { color: c.text }]}
                multiline
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
            </View>

            <TouchableOpacity onPress={handleVoice} style={styles.iconButton}>
              <Ionicons
                name="mic"
                size={24}
                color={isRecording ? "#ef4444" : c.accent}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendButton,
                { backgroundColor: input.trim() ? c.accent : c.border },
              ]}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={input.trim() ? "#ffffff" : c.sub}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Server Config Modal */}
      <ServerConfigModal
        visible={showConfig}
        ip={serverIp}
        port={serverPort}
        onSave={handleSaveConfig}
        onClose={() => setShowConfig(false)}
        c={c}
      />

      {/* Document Viewer Modal */}
      <DocViewerModal
        doc={viewDoc}
        chunks={allChunks}
        onClose={() => setViewDoc(null)}
        c={c}
      />

      {/* Processing Modal */}
      <ProcessingModal
        visible={uploading}
        progress={processingProgress}
        onCancel={() => {
          setUploading(false);
          setProcessingProgress(null);
        }}
        c={c}
      />

      {/* All Chunks Viewer Modal */}
      <AllChunksModal
        chunks={allChunks}
        docs={docs}
        visible={showAllChunks}
        onClose={() => setShowAllChunks(false)}
        c={c}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // Header - Fixed spacing
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8, // Reduced from 40 to 8
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 0, // Ensure no bottom margin
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 0, // Removed margin top
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 4,
  },
  statusLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  urlPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 150,
    marginRight: 4,
  },
  urlPillTxt: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  iconBtn: {
    padding: 4,
  },
  iconBtnTxt: {
    fontSize: 18,
  },

  // RAG Bar
  ragBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  ragBarTxt: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Messages
  messagesList: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 10,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  userBubble: {
    borderBottomRightRadius: 4,
    marginLeft: 8,
  },
  aiBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },

  // System message
  sysRow: {
    alignItems: "center",
    marginVertical: 5,
  },
  sysPill: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
  },
  sysTxt: {
    fontSize: 12,
    fontStyle: "italic",
  },

  // Input
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    minHeight: 40,
    maxHeight: 100,
    justifyContent: "center",
    borderWidth: 1,
  },
  input: {
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 0,
    textAlignVertical: "center",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000088",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 19,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  fieldIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  fieldInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  testBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  testBtnTxt: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  resultTxt: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalBtnTxt: {
    fontWeight: "700",
    fontSize: 15,
  },

  // Document Viewer
  docHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  docHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  docHeaderSub: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHead: {
    fontSize: 15,
    fontWeight: "700",
  },
  chunkCard: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  chunkIdx: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 5,
  },
  chunkTxt: {
    fontSize: 13,
    lineHeight: 20,
  },
  
  // All Chunks Viewer
  docSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  docSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  docSectionSub: {
    fontSize: 11,
  },
  emptyTxt: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },

  // Processing Modal
  processingOverlay: {
    flex: 1,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  processingCard: {
    borderRadius: 20,
    padding: 24,
    width: "80%",
    alignItems: "center",
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  processingMessage: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  cancelBtnTxt: {
    fontWeight: "600",
  },
});