const app = new Vue({
    el: "#app",
    data: {
    socket: null,
    mic: {
        mediaRecorder: null,
        stream: null,
    },
    settings: {
        mode: "transcribe",
        transcription: false,
    },
    isGeneratingSummary: false,
    lockedSpeakers: {},
    currentSpeaker: null,
    currentSegmentWords: [],
    // STRUKTUR DATA BARU UNTUK MULTI-TOPIK
    allTopics: [
        { title: "Topik Pembahasan Awal", phrases: [] }
    ],
    currentTopicIndex: 0,
    punctuationTimer: null,
    showSpeakerEditor: false,
    speakerNameEdits: {},
        speakerColors: {
            "Speaker 1": "#F44336",
            "Speaker 2": "#2196F3",
            "Speaker 3": "#4CAF50",
            "Speaker 4": "#9C27B0",
            "Speaker 5": "#FF9800",
            "Speaker 6": "#FFC107",
            "Speaker 7": "#8BC34A",
            "Speaker 8": "#3F51B5",
            "Speaker 9": "#FF5722",
            "Speaker 10": "#00BCD4",
            "Speaker 11": "#00BCD4",
            "Speaker 12": "#00BCD4",
            "Speaker 13": "#00BCD4",
            "Speaker 14": "#00BCD4",
            "Speaker 15": "#00BCD4",
            "Speaker 16": "#00BCD4",
            "Speaker 17": "#00BCD4",
            "Speaker 18": "#00BCD4",
        },
    },
    async created() {
        console.log("Vue app is initializing...");
        this.setModeBasedOnUrlParam();
        await this.getUserMic();
    },
    methods: {
        setModeBasedOnUrlParam() {
            const url = new URL(location.href);
            const search = new URLSearchParams(url.search);
            if (!search.has("mode")) {
                search.set("mode", "badge");
                window.history.replaceState(null, "", "?" + search.toString());
            }
            this.settings.mode = search.get("mode");
            console.log("App mode set to:", this.settings.mode);
        },
        navigateTo(mode) {
            const url = new URL(location.href);
            const search = new URLSearchParams(url.search);
            search.set("mode", mode);
            window.history.replaceState(null, "", "?" + search.toString());
            this.settings.mode = mode;
        },
        
async getUserMic() {
    try {
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error("Browser tidak mendukung akses mikrofon.");
        }

        if (typeof MediaRecorder === "undefined") {
            throw new Error("MediaRecorder tidak didukung browser.");
        }

        // Meminta izin mikrofon
        this.mic.stream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });

        // Memeriksa format audio
        let mimeType = "";

        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
            mimeType = "audio/webm";
        } else {
            throw new Error("Format audio WebM tidak didukung.");
        }

        // Membuat MediaRecorder
        this.mic.mediaRecorder = new MediaRecorder(
            this.mic.stream,
            { mimeType }
        );

        console.log("Mikrofon berhasil diakses.");

    } catch (err) {
        console.error("Error accessing microphone:", err);

        this.mic.stream = null;
        this.mic.mediaRecorder = null;

        alert("Gagal mengakses mikrofon: " + err.message);
    }
},

async beginTranscription(type = "single") {
    if (this.settings.transcription) return;

    try {
        if (!this.mic.mediaRecorder) {
            await this.getUserMic();
        }

        if (!this.mic.mediaRecorder) {
            throw new Error("Mikrofon belum tersedia.");
        }

        // Mengambil token dari backend Vercel
        const response = await fetch(
            "https://notula-um.vercel.app/deepgram-token"
        );

        if (!response.ok) {
            throw new Error(
                "Gagal mengambil token Deepgram. HTTP " +
                response.status
            );
        }

        const tokenData = await response.json();
        const key = tokenData.key;

        if (!key) {
            throw new Error("Token Deepgram tidak ditemukan.");
        }

        // Konfigurasi Deepgram
        const params = new URLSearchParams({
            model: "nova-2",
            punctuate: "true",
            diarize: "true",
            diarize_speaker_count: "18",
            smart_format: "true",
            language: "id",
            encoding: "opus",
            sample_rate: "48000"
        });

        const wsUrl =
            "wss://api.deepgram.com/v1/listen?" +
            params.toString();

        this.socket = new WebSocket(
            wsUrl,
            ["token", key]
        );

        this.socket.onopen = () => {
            console.log("Deepgram WebSocket connected.");

            this.settings.transcription = type;

            // Mengirim audio ke Deepgram
            this.mic.mediaRecorder.ondataavailable = (event) => {
                if (
                    event.data.size > 0 &&
                    this.socket &&
                    this.socket.readyState === WebSocket.OPEN
                ) {
                    this.socket.send(event.data);
                    console.log("Audio terkirim ke Deepgram.");
                }
            };

            this.mic.mediaRecorder.start(1000);
        };

        // Menerima hasil transkripsi
        this.socket.onmessage = (message) => {
            try {
                const data = JSON.parse(message.data);

                console.log("Hasil Deepgram:", data);

                this.transcriptionResults(data);

            } catch (err) {
                console.error("Error parsing transcript:", err);
            }
        };

        this.socket.onerror = (error) => {
            console.error("Deepgram WebSocket error:", error);

            alert("Koneksi Deepgram mengalami kesalahan.");
        };

        this.socket.onclose = (event) => {
            console.log(
                "WebSocket closed:",
                event.code,
                event.reason
            );

            this.settings.transcription = false;
        };

    } catch (error) {
        console.error("Error starting transcription:", error);

        this.settings.transcription = false;

        alert("Gagal memulai transkripsi: " + error.message);
    }
},


        async transcriptionResults(data) {
            if (!data?.channel?.alternatives?.length) return;
            const { is_final, channel } = data;
            const words = channel.alternatives[0].words || [];
            if (!words.length) return;

            const rawId = words[0].speaker ?? 0;
            if (!(rawId in this.lockedSpeakers)) {
                const used = Object.values(this.lockedSpeakers);
                let n = 1;
                while (used.includes(`Speaker ${n}`)) n++;
                this.lockedSpeakers[rawId] = `Speaker ${n}`;
            }
            const speaker = this.lockedSpeakers[rawId];

            this.currentSegmentWords = words.map(w => w.punctuated_word || w.word);

            if (this.currentSpeaker && speaker !== this.currentSpeaker) {
                await this.flushSegment();
            } else if (is_final) {
                await this.flushSegment();
                this.lastWordTime = Date.now();
            }
            this.currentSpeaker = speaker;
        },
        async flushSegment() {
            if (!this.currentSegmentWords.length || !this.currentSpeaker) return;
            const rawText = this.currentSegmentWords.join(' ').trim();
            let formatted = rawText;
            try {
                const resp = await fetch('/punctuate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: rawText })
                });
                const json = await resp.json();
                if (json.formattedText) formatted = json.formattedText;
            } catch (e) {
                console.error('Punctuation error:', e);
            }
            this.allTopics[this.currentTopicIndex].phrases.push({ speaker: this.currentSpeaker, word: formatted.trim() });
            this.currentSegmentWords = [];
        },
        async fixPunctuation() { },
        async stopTranscription() {
  // Simpan segmen terakhir yang mungkin masih tertahan
  await this.flushSegment();

  // Baru hentikan semua proses
  if (this.mic.mediaRecorder && this.mic.mediaRecorder.state !== "inactive") {
    this.mic.mediaRecorder.stop();
  }
  if (this.socket && this.socket.readyState === WebSocket.OPEN) {
    this.socket.close();
  }
  
  this.settings.transcription = false;
  console.log("Transkripsi telah dihentikan.");
},
        gantiTopik() {
    const newTitle = prompt("Masukkan judul untuk topik baru:", `Topik #${this.allTopics.length + 1}`);
    if (newTitle) {
        this.allTopics.push({ title: newTitle, phrases: [] });
        this.currentTopicIndex++;
    }
},
        clearTranscript() {
  // Mengembalikan 'allTopics' ke kondisi awal
  this.allTopics = [
    { title: "Topik Pembahasan Awal", phrases: [] }
  ];
  this.currentTopicIndex = 0;

  // Mereset data speaker dan segmen live
  this.lockedSpeakers = {};
  this.currentSpeaker = null;
  this.currentSegmentWords = [];
  
  console.log("Transkrip telah dihapus.");
},
        openSpeakerEditor() {
    this.speakerNameEdits = { ...this.lockedSpeakers };
    this.showSpeakerEditor = true;
  },

  saveSpeakerNames() {
    for (const rawId in this.speakerNameEdits) {
      const newName = this.speakerNameEdits[rawId];
      if (this.lockedSpeakers[rawId] !== newName) {
        this.$set(this.lockedSpeakers, rawId, newName);
      }
    }
    this.showSpeakerEditor = false;
  },
      async fetchSummaryAndDownload() {
            if (this.isGeneratingSummary) return;
            if (this.groupTranscript.length === 0) {
                return alert("Tidak ada transkripsi untuk diringkas!");
            }
            this.isGeneratingSummary = true;
            try {
                const tableHeader = `{\\trowd\\trgaph108\\trvalignm\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx3000\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx7000\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx10000\\pard\\qc\\intbl\\b PERSOALAN\\b0\\cell\\pard\\intbl\\b TANGGAPAN PESERTA\\b0\\cell\\pard\\intbl\\b SIMPULAN/REKOMENDASI\\b0\\cell\\row}`;
                
                let allTopicRows = [];
                for (const topicBlock of this.allTopics) {
                    if (topicBlock.phrases.length === 0) continue;

                    const transcriptForThisTopic = topicBlock.phrases.map(p => p.word).join(' ');
                    
                    let groupedForTopic = [];
                    if (topicBlock.phrases.length > 0) {
                        let currentGroup = { speaker: topicBlock.phrases[0].speaker, word: topicBlock.phrases[0].word };
                        for(let i = 1; i < topicBlock.phrases.length; i++) {
                            if(topicBlock.phrases[i].speaker === currentGroup.speaker) {
                                currentGroup.word += ' ' + topicBlock.phrases[i].word;
                            } else {
                                groupedForTopic.push(currentGroup);
                                currentGroup = { speaker: topicBlock.phrases[i].speaker, word: topicBlock.phrases[i].word };
                            }
                        }
                        groupedForTopic.push(currentGroup);
                    }

                    const summaryPromises = groupedForTopic.map(segment => fetch('/api/summarize-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: segment.word }) }).then(res => res.json()));
                    const overallSummaryPromise = fetch('/api/summarize-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: transcriptForThisTopic }) }).then(res => res.json());
                    const topicPromise = fetch('/api/get-topic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: transcriptForThisTopic }) }).then(res => res.json());

                    const [individualSummaries, overallSummaryResult, topicResult] = await Promise.all([Promise.all(summaryPromises), overallSummaryPromise, topicPromise]);

                    const processedData = groupedForTopic.map((segment, index) => ({
                    speaker: segment.speaker,
                    // Tambahkan .replace() untuk menghapus "Ringkasan:"
                    summary: (individualSummaries[index]?.summary || "Tidak ada ringkasan.").replace(/^Ringkasan:/i, '').trim()
                    }));
                    // Tambahkan .replace() untuk menghapus "Ringkasan:"
                    const overallSummary = (overallSummaryResult.summary || "Tidak ada simpulan.").replace(/^Ringkasan:/i, '').trim();
                    const topic = topicResult.topic || "Topik tidak teridentifikasi.";
                    
                    const rtfRows = this.generateRtfRowsForTopic(processedData, overallSummary, topic, topicBlock.title);
                    allTopicRows.push(rtfRows);
                }

                const finalRtfContent = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\pard\\fs24{\\b NOTULEN RAPAT}\\par\\par${tableHeader}${allTopicRows.join('')}}`; 
                
                const blob = new Blob([finalRtfContent], { type: "application/rtf" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "Notulen_Rapat_Lengkap.rtf";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                console.error("Error fetching or processing summary:", error);
                alert(`Terjadi kesalahan saat membuat ringkasan: ${error.message}`);
            } finally {
                this.isGeneratingSummary = false;
            }
        },
        generateRtfRowsForTopic(processedData, overallSummary, topic, topicTitle) {
            const rtfEscape = (str) => this.escapeRtfText(String(str));
            const topicTitleRow = `{\\trowd\\trgaph108\\trvalignm\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\clmgf\\cellx10000\\pard\\qc\\intbl\\b ${rtfEscape(topicTitle)}\\b0\\cell\\row}`;
            const tanggapanKonten = processedData.map((data, index) => `{\\b ${index + 1}. ${rtfEscape(data.speaker)}:} ${rtfEscape(data.summary).trim()}`).join('\\par\\par ');
            const contentRow = `{\\trowd\\trgaph108\\trvalignm\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx3000\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx7000\\clbrdrt\\brdrs\\brdrw10 \\clbrdrl\\brdrs\\brdrw10 \\clbrdrb\\brdrs\\brdrw10 \\clbrdrr\\brdrs\\brdrw10 \\cellx10000\\pard\\qc\\intbl \\par ${rtfEscape(topic)}\\cell\\pard\\intbl ${tanggapanKonten}\\cell\\pard\\qc\\intbl \\par ${rtfEscape(overallSummary)}\\cell\\row}`;
            return `${topicTitleRow}${contentRow}`;
        },
        escapeRtfText(text) {
            if (text === undefined || text === null) return "";
            return String(text).replace(/\\/g, "\\\\").replace(/{/g, "\\{").replace(/}/g, "\\}");
        }
    }, 
    computed: {
        singleTranscript() {
            let transcript = "";
            let lastSp = null;
            let sentence = "";
            this.groupTranscript.forEach((w, i) => {
                if (lastSp && w.speaker !== lastSp) {
                    transcript += `\n\n${lastSp}: ${sentence.trim()}\n\n`;
                    sentence = "";
                }
                sentence += `${w.word} `;
                lastSp = w.speaker;
                if (i === this.groupTranscript.length - 1) {
                    transcript += `${lastSp}: ${sentence.trim()}`;
                }
            });
            return transcript.trim();
        },
       groupTranscript() {
    return this.allTopics.flatMap(topic => topic.phrases);

        }
    },
    watch: {
        singleTranscript: function () {
            this.$nextTick(() => {
                const transcriptContainer = this.$el.querySelector('.transcript-output');
                if (transcriptContainer) {
                    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
                }
            });
        }
    }
});
