import httpx
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import json
import uuid
import os
from dotenv import load_dotenv  # <--- Добавили импорт

# Загружаем секреты из файла .env
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Теперь мы не пишем ключ в открытую, а берем из секретного файла!
GROQ_API_KEY = os.getenv("GROQ_API_KEY") 
DB_FILE = "lessons_db.json"

# --- ОБНОВЛЕННАЯ МОДЕЛЬ ДАННЫХ ---
class LessonRequest(BaseModel):
    topic: str
    diagnosis: str  # Принимаем: "РАС", "СДВГ", "ЗПР" или "Норма"

# --- БАЗА ДАННЫХ ---
def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_db(db_data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(db_data, f, ensure_ascii=False, indent=4)

@app.post("/api/lessons/generate")
async def generate_lesson(request: LessonRequest):
    print(f"\n---> ГЕНЕРАЦИЯ УРОКА: {request.topic} для диагноза: {request.diagnosis}")
    lesson_id = str(uuid.uuid4())[:6].upper()

   # --- ПЕРСОНАЛИЗИРОВАННЫЙ ПРОМПТ ---
    prompt = f"""
    Ты — эксперт по коррекционной педагогике и AR-обучению. 
    Создай урок на тему: '{request.topic}' для ребенка с диагнозом: '{request.diagnosis}'.
    
    СТРОГИЕ ПРАВИЛА:
    - Пиши простым языком. Если диагноз РАС - используй сухие, четкие команды. Если СДВГ - больше динамики.
    
    СТРУКТУРА УРОКА (СТРОГО 4 ШАГА):
    1. Теория (spheres_count: 0). Просто объясни правило. Пример: "Умножение — это сложение одинаковых чисел".
    2. Представление (spheres_count: X - первое число). Дай визуализацию первой части задачи. Пример: "Представь, что у нас есть корзина с 5 яблоками. Посмотри на них."
    3. ИНТЕРАКТИВ (spheres_count: Z - итоговое число). Добавь второе условие и задай вопрос. Пример: "Если таких корзин будет 2, то добавится еще 5 яблок. Посчитай, сколько их будет при 2 умножить на 5?". 
       ОБЯЗАТЕЛЬНО: is_interactive: true, correct_answer: итоговое число, 
       praise_text: "Супер! Все верно!", support_text: "Не совсем так. Давай посмотрим на пример еще раз!"
    4. Итог (spheres_count: Z - итоговое число). Закрепление материала.

    Верни ТОЛЬКО JSON:
    {{
        "id": "{lesson_id}",
        "topic": "{request.topic}",
        "diagnosis": "{request.diagnosis}",
        "steps": [
            {{ 
                "step_number": 1, 
                "spheres_count": 0, 
                "voiceover_text": "текст", 
                "title": "название",
                "is_interactive": false,
                "correct_answer": 0,
                "praise_text": "",
                "support_text": ""
            }}
        ]
    }}
    """
    
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "llama-3.1-8b-instant", 
        "messages": [{"role": "user", "content": prompt}], 
        "response_format": {"type": "json_object"}
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=30.0)
            lesson_data = json.loads(response.json()["choices"][0]["message"]["content"])
            
            lesson_data["id"] = lesson_id
            
            db = load_db()
            db[lesson_id] = lesson_data
            save_db(db)
            
            return lesson_data
        except Exception as e:
            return {"error": str(e)}

@app.post("/api/lessons/generate_from_file")
async def generate_lesson_from_file(file: UploadFile = File(...), diagnosis: str = Form(...)):
    content = await file.read()
    # Пытаемся декодировать конспект
    text_content = content.decode("utf-8", errors="ignore")
    
    print(f"\n---> ГЕНЕРАЦИЯ УРОКА ИЗ ФАЙЛА: {file.filename} для диагноза: {diagnosis}")
    lesson_id = str(uuid.uuid4())[:6].upper()

    prompt = f"""
    Ты — эксперт по коррекционной педагогике и AR-обучению. 
    Создай урок на основе следующего конспекта учителя для ребенка с диагнозом: '{diagnosis}'.

    КОНСПЕКТ УЧИТЕЛЯ:
    {text_content}
    
    СТРОГИЕ ПРАВИЛА:
    - Пиши простым языком. Если диагноз РАС - используй сухие, четкие команды. Если СДВГ - больше динамики.
    - Внимательно изучи конспект и выдели из него главную тему и логику для урока. Если в конспекте есть примеры, используй их.
    
    СТРУКТУРА УРОКА (СТРОГО 4 ШАГА):
    1. Теория (spheres_count: 0). Просто объясни правило из конспекта.
    2. Представление (spheres_count: X - первое число). Дай визуализацию первой части задачи.
    3. ИНТЕРАКТИВ (spheres_count: Z - итоговое число). Добавь второе условие и задай вопрос. 
       ОБЯЗАТЕЛЬНО: is_interactive: true, correct_answer: итоговое число, 
       praise_text: "Супер! Все верно!", support_text: "Не совсем так. Давай посмотрим на пример еще раз!"
    4. Итог (spheres_count: Z - итоговое число). Закрепление материала.

    Верни ТОЛЬКО JSON:
    {{
        "id": "{lesson_id}",
        "topic": "Тема из конспекта (сформулируй кратко)",
        "diagnosis": "{diagnosis}",
        "steps": [
            {{ 
                "step_number": 1, 
                "spheres_count": 0, 
                "voiceover_text": "текст", 
                "title": "название",
                "is_interactive": false,
                "correct_answer": 0,
                "praise_text": "",
                "support_text": ""
            }}
        ]
    }}
    """
    
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "llama-3.1-8b-instant", 
        "messages": [{"role": "user", "content": prompt}], 
        "response_format": {"type": "json_object"}
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=30.0)
            lesson_data = json.loads(response.json()["choices"][0]["message"]["content"])
            
            lesson_data["id"] = lesson_id
            
            db = load_db()
            db[lesson_id] = lesson_data
            save_db(db)
            
            return lesson_data
        except Exception as e:
            return {"error": str(e)}

@app.get("/api/lessons/{lesson_id}")
async def get_lesson(lesson_id: str):
    db = load_db()
    clean_id = lesson_id.strip().upper()
    if clean_id in db:
        return db[clean_id]
    raise HTTPException(status_code=404, detail="Урок не найден")