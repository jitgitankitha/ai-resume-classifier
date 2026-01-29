import React, { useState, useEffect, useCallback } from "react";
import { Upload, Briefcase, FileText, History, CheckCircle, AlertCircle, Trash2, Loader2 } from 'lucide-react';


const API_KEY = "AIzaSyCLRfRB-1jiTV9W8aSerjqvzsf18iL40x0"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;


const responseSchema = {
    type: "OBJECT",
    properties: {
        extractedEmail: { type: "STRING" },
        matchScorePercent: { type: "NUMBER" },
        matchSummary: { type: "STRING" },
        topKeywordsMatched: { type: "ARRAY", items: { type: "STRING" } },
        crucialSkillsMissing: { type: "ARRAY", items: { type: "STRING" } }
    },
    required: ["extractedEmail", "matchScorePercent", "matchSummary", "topKeywordsMatched", "crucialSkillsMissing"]
};

const defaultJobDescription = `
Senior Full Stack Engineer
We are seeking a Senior Full Stack Engineer proficient in React (Hooks, Context), Node.js (Express), and MongoDB (Mongoose). The ideal candidate must have experience with cloud deployments (AWS or GCP), CI/CD pipelines (GitHub Actions), and advanced TypeScript. Strong knowledge of RESTful API design, state management (Redux or Zustand), and agile methodologies is required. Experience with real-time data or GraphQL is a significant plus.
`;

const defaultResumeText = `
John Doe
(123) 456-7890 | john.doe@email.com | LinkedIn Profile
Summary: Highly skilled software developer with 6 years of experience building scalable web applications. Proficient in JavaScript, React, and server-side logic using Python (Django).
Experience:
Senior Developer, Tech Innovators (2020-Present)
- Led development of customer-facing portals using React and Redux for state management.
- Designed and implemented REST APIs using Express.js and deployed applications via Docker.
Skills:
Frontend: React, Redux, JavaScript, HTML, CSS, Tailwind CSS
Backend: Node.js, Express.js, Python, Django, PostgreSQL
DevOps: Docker, Git, CI/CD, AWS (S3, EC2)
`;

const ScriptLoader = ({ setStatus }) => {
    useEffect(() => {
        if (typeof window === "undefined") return;

        let pdfReady = false;
        let mammothReady = false;

        const checkReady = () => {
            if (pdfReady && mammothReady) setStatus("ready");
        };

        const pdfScript = document.createElement("script");
        pdfScript.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
        pdfScript.onload = () => {
            // Set worker manually to ensure it loads
            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
                pdfReady = true;
                checkReady();
            }
        };
        document.head.appendChild(pdfScript);

        const mammothScript = document.createElement("script");
        mammothScript.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
        mammothScript.onload = () => {
            mammothReady = true;
            checkReady();
        };
        document.head.appendChild(mammothScript);

        return () => {
        };
    }, [setStatus]);
    return null;
};

function App() {
    const [jobDescription, setJobDescription] = useState(defaultJobDescription.trim());
    const [resumeText, setResumeText] = useState(defaultResumeText.trim());
    const [classificationReport, setClassificationReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [errorMessage, setErrorMessage] = useState(null);
    const [libStatus, setLibStatus] = useState("loading"); 

    useEffect(() => {
        const savedHistory = localStorage.getItem("resume_history");
        if (savedHistory) setHistory(JSON.parse(savedHistory));
    }, []);

    const saveToLocalHistory = (report) => {
        const newEntry = {
            id: Date.now(),
            report,
            jobDescription: jobDescription.substring(0, 50) + '...',
            timestamp: new Date().toLocaleDateString()
        };
        const updatedHistory = [newEntry, ...history];
        setHistory(updatedHistory);
        localStorage.setItem("resume_history", JSON.stringify(updatedHistory));
    };

    const clearHistory = () => {
        localStorage.removeItem("resume_history");
        setHistory([]);
    };

    //FIXED EXTRACTION LOGIC
    const extractTextFromPDF = async (file) => {
        if (!window.pdfjsLib) throw new Error("PDF Library not fully loaded.");
        
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        return fullText;
    };

    const extractTextFromDOCX = async (file) => {
        if (!window.mammoth) throw new Error("DOCX Library not fully loaded.");
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        return result.value;
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setErrorMessage(null);

        try {
            let extractedText = "";
            console.log("Processing file type:", file.type);

            if (file.type === "application/pdf" || file.name.toLowerCase().endsWith('.pdf')) {
                extractedText = await extractTextFromPDF(file);
            } else if (file.name.toLowerCase().endsWith('.docx') || file.type.includes("document")) {
                extractedText = await extractTextFromDOCX(file);
            } else if (file.type === "text/plain" || file.name.toLowerCase().endsWith('.txt')) {
                extractedText = await file.text();
            } else {
                throw new Error("Unsupported file type. Please use PDF, DOCX, or TXT.");
            }

            if (!extractedText || extractedText.trim().length < 5) {
                throw new Error("File appears empty or unreadable (scanned PDFs/Images are not supported).");
            }

            setResumeText(extractedText);
        } catch (error) {
            console.error(error);
            setErrorMessage(error.message || "Failed to read file.");
        } finally {
            setLoading(false);
            event.target.value = null; 
        }
    };

    const classifyResume = useCallback(async () => {
        if (!jobDescription || !resumeText) {
            setErrorMessage("Please provide both Job Description and Resume.");
            return;
        }
        setLoading(true);
        setClassificationReport(null);
        setErrorMessage(null);

        const prompt = `
            You are a senior HR Recruiter AI. Classify this resume strictly against the job description.
            Response MUST be valid JSON adhering to the schema.
            --- JOB DESCRIPTION ---
            ${jobDescription}
            --- CANDIDATE RESUME ---
            ${resumeText}
        `;

        try {
            const payload = {
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: "You are a JSON-only AI recruiter." }] },
                generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema },
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const result = await response.json();
            const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (jsonText) {
                const parsed = JSON.parse(jsonText);
                setClassificationReport(parsed);
                saveToLocalHistory(parsed);
            } else throw new Error("Empty response from AI.");
        } catch (error) {
            setErrorMessage(`Failed to classify: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }, [jobDescription, resumeText]);

    const HistoryItem = ({ report, jobDescription, timestamp }) => {
        if (!report?.topKeywordsMatched) return null;
        const scoreColor = report.matchScorePercent >= 70 ? 'text-green-600' : report.matchScorePercent >= 50 ? 'text-yellow-600' : 'text-red-600';
        return (
            <div className="border p-4 rounded-lg shadow-sm bg-white mb-4 hover:shadow-md transition">
                <div className="flex justify-between">
                    <h3 className="font-bold text-gray-800">Match: <span className={scoreColor}>{report.matchScorePercent}%</span></h3>
                    <span className="text-xs text-gray-400">{timestamp}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mb-2">{jobDescription}</p>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <ScriptLoader setStatus={setLibStatus} />

            <div className="max-w-7xl mx-auto">
                <header className="text-center mb-10">
                    <h1 className="text-4xl font-extrabold text-indigo-700">AI Resume Classifier</h1>
                    <p className="text-gray-400 text-sm mt-2">No-Database Version (Local History Only)</p>
                </header>

                {errorMessage && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2"/> {errorMessage}
                    </div>
                )}

                <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100">
                            <h2 className="text-2xl font-bold text-indigo-600 mb-3 flex items-center"><Briefcase className="mr-2"/> Job Description</h2>
                            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows="8" className="w-full p-3 border rounded-lg" />
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-lg border border-green-100">
                            <h2 className="text-2xl font-bold text-green-600 mb-3 flex items-center"><FileText className="mr-2"/> Candidate Resume</h2>
                            <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} rows="8" className="w-full p-3 border rounded-lg mb-4" />
                            
                            <label className={`inline-flex items-center font-bold py-2 px-6 rounded-lg transition ${libStatus === 'ready' ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
                                {libStatus === 'ready' ? <Upload className="w-5 h-5 mr-2"/> : <Loader2 className="w-5 h-5 mr-2 animate-spin"/>}
                                {libStatus === 'ready' ? 'Upload PDF / DOCX / TXT' : 'Loading Libraries...'}
                                <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileChange} className="hidden" disabled={libStatus !== 'ready'} />
                            </label>
                        </div>

                        <button onClick={classifyResume} disabled={loading || !jobDescription || !resumeText} className={`w-full py-4 rounded-full text-xl font-bold text-white shadow-xl ${loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            {loading ? 'Analyzing...' : 'Classify Resume'}
                        </button>
                    </div>

                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white p-6 rounded-xl shadow-2xl border-t-4 border-indigo-500 min-h-64">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Analysis Report</h2>
                            {classificationReport ? (
                                <div>
                                    <div className="flex items-center justify-between mb-4 border-b pb-4">
                                        <span className="text-lg font-bold">Score</span>
                                        <span className={`text-4xl font-extrabold ${classificationReport.matchScorePercent >= 70 ? 'text-green-500' : 'text-orange-500'}`}>{classificationReport.matchScorePercent}%</span>
                                    </div>
                                    <p className="text-gray-600 italic text-sm mb-4">"{classificationReport.matchSummary}"</p>
                                    <div className="mb-4"><p className="font-semibold text-sm text-green-700">Matched:</p>{classificationReport.topKeywordsMatched.join(", ")}</div>
                                    <div className="mb-6"><p className="font-semibold text-sm text-red-700">Missing:</p>{classificationReport.crucialSkillsMissing.join(", ")}</div>
                                </div>
                            ) : (
                                <div className="text-center text-gray-400 py-10"><CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-20"/><p>Ready to analyze</p></div>
                            )}
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-700 flex items-center"><History className="mr-2 w-5 h-5"/> History</h2>
                                {history.length > 0 && (
                                    <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700 flex items-center">
                                        <Trash2 className="w-3 h-3 mr-1"/> Clear
                                    </button>
                                )}
                            </div>
                            {history.length > 0 ? history.map(item => <HistoryItem key={item.id} {...item} />) : <p className="text-gray-400 text-sm">No recent scans.</p>}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
export default App;