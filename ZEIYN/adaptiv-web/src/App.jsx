import { useState, useRef, useEffect } from "react"; // Обновлено ИИ
import { motion, AnimatePresence } from "framer-motion";
import logo from "./logo.png"; 

const themes = {
  light: { bg: "linear-gradient(160deg, #F0F7FF 0%, #F8FAFC 40%, #EEF4FF 100%)", cardBg: "rgba(255, 255, 255, 0.7)", textMain: "#0C4A6E", textMuted: "#64748B", border: "rgba(226,232,240,0.8)", inputBg: "rgba(255,255,255,0.8)" },
  dark: { bg: "linear-gradient(160deg, #0F172A 0%, #1E293B 40%, #0F172A 100%)", cardBg: "rgba(30, 41, 59, 0.7)", textMain: "#F8FAFC", textMuted: "#94A3B8", border: "rgba(51,65,85,0.8)", inputBg: "rgba(15, 23, 42, 0.6)" }
};

function AmbientOrbs({ isDark }) {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: isDark ? "radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%)" : "radial-gradient(circle, rgba(56,189,248,0.13) 0%, transparent 70%)", top: -150, left: -100, filter: "blur(40px)" }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: isDark ? "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)" : "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)", bottom: 0, right: -80, filter: "blur(50px)" }} />
    </div>
  );
}

function FloatingLogo() {
  return (
    <div style={{ position: "relative", width: 220, height: 220, flexShrink: 0 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "1.5px solid rgba(56,189,248,0.25)", boxShadow: "0 0 30px rgba(56,189,248,0.1)" }} />
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} style={{ position: "absolute", inset: 20, borderRadius: "50%", border: "1px dashed rgba(99,102,241,0.3)" }} />
      <motion.div animate={{ y: [-8, 8, -8], rotateY: [0, 20, 0, -20, 0], rotateX: [0, -10, 0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", perspective: "1000px" }}>
        <img src={logo} alt="3D Logo" style={{ width: 100, height: 100, objectFit: "contain", borderRadius: 20, boxShadow: `0 20px 60px rgba(29,78,216,0.5), 0 4px 16px rgba(56,189,248,0.4)` }} />
      </motion.div>
    </div>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState(null); 
  const [isLoginView, setIsLoginView] = useState(true);
  
  // Вкладки меню
  const [activeTab, setActiveTab] = useState("Уроки");
  
  // Формы авторизации
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", role: "teacher" });
  
  // Генерация
  const [topic, setTopic] = useState("");
  const [diagnosis, setDiagnosis] = useState("Норма");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lesson, setLesson] = useState(null);
  const [copied, setCopied] = useState(false);
  
  const currentTheme = isDark ? themes.dark : themes.light;

  // --- ЗАПОМИНАНИЕ УСТРОЙСТВА ПРИ ЗАГРУЗКЕ ---
  useEffect(() => {
    const savedUser = localStorage.getItem('adaptiv_user');
    const savedTheme = localStorage.getItem('adaptiv_theme');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedTheme === 'dark') setIsDark(true);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    localStorage.setItem('adaptiv_theme', !isDark ? 'dark' : 'light');
  };

  // --- ЛОГИКА АВТОРИЗАЦИИ С БАЗОЙ ДАННЫХ ---
  const handleAuthSubmit = async () => {
    if (!authForm.email || !authForm.password || (!isLoginView && !authForm.name)) {
        return alert("Заполните все поля!");
    }

    const endpoint = isLoginView ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Ошибка авторизации");
      
      // Сохраняем пользователя в память браузера (запоминаем устройство)
      setUser(data);
      localStorage.setItem('adaptiv_user', JSON.stringify(data));
      
    } catch (e) {
      alert(e.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('adaptiv_user');
  };

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true); setLesson(null);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/lessons/generate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: topic.trim(), diagnosis: diagnosis })
      });
      if (!res.ok) throw new Error("Ошибка");
      const data = await res.json();
      setLesson(data);
    } catch (e) { alert("Сервер Python выключен или произошла ошибка!"); } finally { setLoading(false); }
  };

  const handleGenerateFromFile = async () => {
    if (!selectedFile) return alert("Выберите файл конспекта!");
    setLoading(true); setLesson(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("diagnosis", diagnosis);
      
      const res = await fetch("http://127.0.0.1:8000/api/lessons/generate_from_file", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Ошибка");
      const data = await res.json();
      setLesson(data);
    } catch (e) { alert("Сервер Python выключен или произошла ошибка!"); } finally { setLoading(false); }
  };

  // ─── ЭКРАН ВХОДА ───────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", background: currentTheme.bg, fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <AmbientOrbs isDark={isDark} />
        <button onClick={toggleTheme} style={{ position: "absolute", top: 20, right: 32, background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, padding: "10px", borderRadius: "50%", cursor: "pointer", color: currentTheme.textMain }}>{isDark ? "☀️" : "🌙"}</button>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ background: currentTheme.cardBg, backdropFilter: "blur(20px)", border: `1px solid ${currentTheme.border}`, padding: 40, borderRadius: 24, width: "100%", maxWidth: 440, zIndex: 1, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <img src={logo} alt="Logo" style={{ height: 60, margin: "0 auto 16px", borderRadius: 12 }} />
            <h2 style={{ fontSize: 24, fontWeight: 800, color: currentTheme.textMain }}>{isLoginView ? "Вход в Адаптив-AR" : "Регистрация"}</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!isLoginView && (
                <input placeholder="Ваше Имя" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} style={{ padding: 14, borderRadius: 12, border: `1px solid ${currentTheme.border}`, background: currentTheme.inputBg, color: currentTheme.textMain, outline: "none" }} />
            )}
            <input type="email" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} style={{ padding: 14, borderRadius: 12, border: `1px solid ${currentTheme.border}`, background: currentTheme.inputBg, color: currentTheme.textMain, outline: "none" }} />
            <input type="password" placeholder="Пароль" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} style={{ padding: 14, borderRadius: 12, border: `1px solid ${currentTheme.border}`, background: currentTheme.inputBg, color: currentTheme.textMain, outline: "none" }} />
            
            {!isLoginView && (
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setAuthForm({...authForm, role: 'teacher'})} style={{ flex: 1, padding: 10, background: authForm.role === 'teacher' ? "#38BDF8" : "transparent", border: "1px solid #38BDF8", color: authForm.role === 'teacher' ? "white" : currentTheme.textMain, borderRadius: 8, cursor: "pointer" }}>Учитель</button>
                    <button onClick={() => setAuthForm({...authForm, role: 'parent'})} style={{ flex: 1, padding: 10, background: authForm.role === 'parent' ? "#38BDF8" : "transparent", border: "1px solid #38BDF8", color: authForm.role === 'parent' ? "white" : currentTheme.textMain, borderRadius: 8, cursor: "pointer" }}>Родитель</button>
                </div>
            )}

            <button onClick={handleAuthSubmit} style={{ width: "100%", padding: 16, background: "linear-gradient(135deg, #38BDF8, #1D4ED8)", color: "white", border: "none", borderRadius: 12, fontWeight: 700, cursor: "pointer", marginTop: 10 }}>
              {isLoginView ? "Войти" : "Создать аккаунт"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 24, color: currentTheme.textMuted, fontSize: 13 }}>
            {isLoginView ? "Нет аккаунта? " : "Уже есть аккаунт? "}
            <span onClick={() => setIsLoginView(!isLoginView)} style={{ color: "#38BDF8", cursor: "pointer", fontWeight: 600 }}>{isLoginView ? "Создать" : "Войти"}</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── ГЛАВНЫЙ ДАШБОРД ───────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: currentTheme.bg, fontFamily: "'Plus Jakarta Sans', sans-serif", position: "relative", color: currentTheme.textMain, transition: "background 0.3s" }}>
      <AmbientOrbs isDark={isDark} />

      <header style={{ position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(20px)", background: currentTheme.cardBg, borderBottom: `1px solid ${currentTheme.border}`, padding: "0 32px", height: 70, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logo} alt="Logo" style={{ height: 38, borderRadius: 8 }} />
          <div><div style={{ fontSize: 16, fontWeight: 800, color: currentTheme.textMain }}>Адаптив-AR</div></div>
        </div>

        {/* --- РАБОЧИЕ ВКЛАДКИ МЕНЮ --- */}
        <nav style={{ display: "flex", gap: 10, display: user.role === 'parent' ? 'none' : 'flex' }}>
          {["Уроки", "Мои ученики", "Аналитика", "Настройки"].map((item) => (
            <button key={item} onClick={() => setActiveTab(item)} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: activeTab === item ? "rgba(56,189,248,0.15)" : "transparent", color: activeTab === item ? "#38BDF8" : currentTheme.textMuted, fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
              {item}
            </button>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={toggleTheme} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer" }}>{isDark ? "☀️" : "🌙"}</button>
          <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              {/* --- ИМЯ БЕРЕТСЯ ИЗ БАЗЫ ДАННЫХ --- */}
              <div style={{ fontSize: 14, fontWeight: 700 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: currentTheme.textMuted }}>{user.role === 'teacher' ? 'Дефектолог' : 'Режим ученика'}</div>
            </div>
            <button onClick={handleLogout} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${currentTheme.border}`, background: "transparent", color: currentTheme.textMain, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Выйти</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 32px", position: "relative", zIndex: 1 }}>
        
        {/* РОУТИНГ ПО ВКЛАДКАМ */}
        {activeTab === "Уроки" && user.role === 'teacher' && (
          <>
            <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40, marginBottom: 64 }}>
              <div style={{ flex: 1, maxWidth: 600 }}>
                <h1 style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
                  Трансформируйте уроки<br /><span style={{ background: "linear-gradient(90deg, #38BDF8, #6366F1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>в 3D-пространство</span>
                </h1>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 30 }}>
                  <select value={diagnosis} onChange={e => setDiagnosis(e.target.value)} style={{ padding: 18, background: currentTheme.inputBg, border: `1px solid ${currentTheme.border}`, borderRadius: 14, fontSize: 16, color: currentTheme.textMain, outline: "none", cursor: "pointer", fontFamily: "inherit" }}>
                    <option value="Норма">Особенности: Норма (без особенностей)</option>
                    <option value="РАС">Особенности: РАС</option>
                    <option value="СДВГ">Особенности: СДВГ</option>
                    <option value="ЗПР">Особенности: ЗПР</option>
                  </select>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Тема урока (например, Основы сложения)" style={{ flex: 1, minWidth: 200, padding: 18, background: currentTheme.inputBg, border: `1px solid ${currentTheme.border}`, borderRadius: 14, fontSize: 16, color: currentTheme.textMain, outline: "none" }} />
                    <button onClick={handleGenerate} disabled={loading || !topic.trim()} style={{ padding: "18px 24px", background: (loading || !topic.trim()) ? currentTheme.border : "linear-gradient(135deg, #38BDF8, #1D4ED8)", border: "none", borderRadius: 14, color: "white", fontSize: 16, fontWeight: 700, cursor: (loading || !topic.trim()) ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>{loading ? "ИИ в работе..." : "✦ Сгенерировать"}</button>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                        <input type="file" accept=".txt" onChange={e => setSelectedFile(e.target.files[0])} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }} />
                        <div style={{ height: "100%", padding: "18px", background: currentTheme.inputBg, border: `1px dashed ${currentTheme.border}`, borderRadius: 14, fontSize: 16, color: selectedFile ? currentTheme.textMain : currentTheme.textMuted, display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box" }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile ? selectedFile.name : "📄 Загрузить конспект (.txt)"}</span>
                        </div>
                    </div>
                    <button onClick={handleGenerateFromFile} disabled={loading || !selectedFile} style={{ padding: "18px 24px", background: (loading || !selectedFile) ? currentTheme.border : "linear-gradient(135deg, #8B5CF6, #6366F1)", border: "none", borderRadius: 14, color: "white", fontSize: 16, fontWeight: 700, cursor: (loading || !selectedFile) ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>{loading ? "ИИ в работе..." : "✦ Из файла"}</button>
                  </div>
                </div>
              </div>
              <FloatingLogo />
            </motion.section>

            {lesson && !loading && (
              <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 40 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, padding: "20px 28px", background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 16 }}>
                  <div><span style={{ fontSize: 12, color: currentTheme.textMuted, textTransform: "uppercase", fontWeight: 700 }}>ID урока</span><div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{lesson.id}</div></div>
                  <button onClick={() => { navigator.clipboard.writeText(lesson.id); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ padding: "12px 24px", background: copied ? "#16A34A" : "linear-gradient(135deg, #38BDF8, #6366F1)", border: "none", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer" }}>{copied ? "✓ Скопировано!" : "📋 Копировать код"}</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
                  {lesson.steps.map((step, i) => (
                    <div key={i} style={{ background: currentTheme.cardBg, border: `1px solid ${currentTheme.border}`, borderRadius: 20, padding: 28 }}>
                      <div style={{ background: "linear-gradient(145deg, #0C4A6E, #1D4ED8)", borderRadius: 14, padding: "16px 20px", marginBottom: 20 }}>
                        <div style={{ fontSize: 11, color: "#BAE6FD", fontWeight: 700, marginBottom: 8 }}>ШАГ {step.step_number} • AR ВИЗУАЛИЗАЦИЯ</div>
                        <div style={{ fontSize: 15, color: "white", lineHeight: 1.5 }}>{step.ar_visual_element}</div>
                      </div>
                      <div style={{ fontSize: 14, color: currentTheme.textMuted, lineHeight: 1.6 }}><strong>Действие учителя:</strong> {step.teacher_action}</div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}
          </>
        )}

        {/* --- НОВЫЕ ВКЛАДКИ (ОЖИДАЮТ ДАННЫХ ИЗ МОБИЛЬНОГО ПРИЛОЖЕНИЯ) --- */}
        {activeTab === "Мои ученики" && (
          <div style={{ padding: 40, background: currentTheme.cardBg, borderRadius: 20, border: `1px solid ${currentTheme.border}`, textAlign: "center" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>База учеников</h2>
            <p style={{ color: currentTheme.textMuted }}>Здесь появятся ученики после того, как они войдут в мобильное приложение по вашим ID уроков.</p>
          </div>
        )}

        {activeTab === "Аналитика" && (
          <div style={{ padding: 40, background: currentTheme.cardBg, borderRadius: 20, border: `1px solid ${currentTheme.border}`, textAlign: "center" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 10 }}>Аналитика стресса и фокуса</h2>
            <p style={{ color: currentTheme.textMuted }}>Графики с Galaxy Watch и данные с камеры телефона будут транслироваться сюда в реальном времени.</p>
          </div>
        )}

        {activeTab === "Настройки" && (
          <div style={{ padding: 40, background: currentTheme.cardBg, borderRadius: 20, border: `1px solid ${currentTheme.border}` }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Настройки профиля</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 300 }}>
              <label style={{ color: currentTheme.textMuted, fontSize: 14 }}>Имя в системе:</label>
              <input value={user.name} disabled style={{ padding: 14, borderRadius: 12, border: `1px solid ${currentTheme.border}`, background: currentTheme.inputBg, color: currentTheme.textMain }} />
              <label style={{ color: currentTheme.textMuted, fontSize: 14, marginTop: 10 }}>Уровень ИИ-адаптации по умолчанию:</label>
              <select style={{ padding: 14, borderRadius: 12, border: `1px solid ${currentTheme.border}`, background: currentTheme.inputBg, color: currentTheme.textMain }}>
                <option>Средний (Аутизм)</option>
                <option>Легкий (Синдром Дауна)</option>
              </select>
            </div>
          </div>
        )}

        {/* Экран Родителя */}
        {user.role === 'parent' && (
          <div style={{ textAlign: "center", paddingTop: 80 }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>Здравствуйте, {user.name}!</h1>
            <p style={{ color: currentTheme.textMuted, marginBottom: 40 }}>Введите ID урока, чтобы подготовить AR-среду</p>
            <div style={{ display: "flex", gap: 10, maxWidth: 500, margin: "0 auto" }}>
              <input placeholder="Вставить ID урока..." style={{ flex: 1, padding: 18, background: currentTheme.inputBg, border: `1px solid ${currentTheme.border}`, borderRadius: 14, color: currentTheme.textMain, fontSize: 16 }} />
              <button style={{ padding: "0 30px", background: "linear-gradient(135deg, #38BDF8, #1D4ED8)", color: "white", borderRadius: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>Старт</button>
            </div>
          </div>
        )}

      </main>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap'); body { margin: 0; }`}</style>
    </div>
  );
}