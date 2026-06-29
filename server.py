import http.server
import socketserver
import json
import urllib.request
import urllib.error
import os

PORT = 8000

def load_env():
    env = {}
    if os.path.exists('.env'):
        try:
            with open('.env', 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        env[k.strip()] = v.strip()
        except Exception as e:
            print(f"Error loading .env file: {e}")
    return env

ENV_VARS = load_env()

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/evaluate':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                req_data = json.loads(post_data.decode('utf-8'))
            except Exception as ex:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f"Invalid JSON payload: {str(ex)}"}).encode('utf-8'))
                return

            provider = req_data.get('provider')
            api_key = req_data.get('apiKey')
            model = req_data.get('model')
            tense = req_data.get('tense')
            prompt = req_data.get('prompt')
            sentence = req_data.get('sentence')
            
            # Fallback to server env keys if client didn't supply one
            if not api_key:
                if provider == 'groq':
                    api_key = os.environ.get('TENSENSEGROQ') or os.environ.get('tensensegroq') or os.environ.get('GROQ_API_KEY') or ENV_VARS.get('TENSENSEGROQ') or ENV_VARS.get('tensensegroq') or ENV_VARS.get('GROQ_API_KEY')
                elif provider == 'gemini':
                    api_key = os.environ.get('GEMINI_API_KEY') or ENV_VARS.get('GEMINI_API_KEY')

            if not api_key:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': "API Key tidak ditemukan. Silakan atur di menu Settings atau buat file .env di server."}).encode('utf-8'))
                return
            
            system_instruction = (
                "You are an expert English teacher and grammar evaluator. Analyze the user's sentence and verify:\n"
                "1. Grammar correctness: Check spelling, punctuation, syntax, and word choices.\n"
                "2. Tense matching: Does the sentence strictly use the requested target English tense? Be extremely precise.\n"
                "3. Context matching: Does the sentence's topic and content directly match or answer the given prompt/topic?\n\n"
                "Provide your response strictly as a JSON object, starting with { and ending with }. Do not wrap it in markdown code blocks or add any markdown formatting around it.\n"
                "Your response MUST be in JSON format matching this exact schema:\n"
                "{\n"
                "  \"correct\": true,\n"
                "  \"score\": 90,\n"
                "  \"tenseMatch\": true,\n"
                "  \"contextMatch\": true,\n"
                "  \"explanation\": \"Penjelasan rinci mengenai tata bahasa, kecocokan tense, dan apakah kalimat tersebut menjawab prompt, ditulis dalam Bahasa Indonesia.\",\n"
                "  \"corrected_tense\": \"Bentuk koreksi tense langsung dari kalimat input user agar sesuai dengan target tense. MUST BE IN ENGLISH! Contoh: Jika input 'i slept' dan target 'Present Continuous', ubah menjadi 'I am sleeping'. Kalimat harus mempertahankan kata kerja/makna asal user tapi diubah tansenya secara benar.\",\n"
                "  \"suggested_context\": \"Rekomendasi kalimat baru yang tansenya sesuai DAN menjawab konteks prompt dengan baik. MUST BE IN ENGLISH! (misal: 'I am laughing with my friends'). Jika input user sudah pas secara tense dan konteks, isi ini sama dengan input asli.\",\n"
                "  \"highlight_explanation\": \"Keterangan bagian mana saja yang diubah dan alasannya dalam Bahasa Indonesia. Jika tidak ada koreksi, tulis 'Tidak ada kesalahan'.\"\n"
                "}\n"
                "Ensure that \"explanation\" and \"highlight_explanation\" are written in clear, natural Bahasa Indonesia, but \"corrected_tense\" and \"suggested_context\" MUST be written in English. Do not output anything else than the JSON object."
            )
            
            user_content = f"Target Tense: {tense}\nPrompt: {prompt}\nUser's Sentence: \"{sentence}\""
            
            response_json = None
            try:
                if provider == 'groq':
                    url = 'https://api.groq.com/openai/v1/chat/completions'
                    headers = {
                        'Content-Type': 'application/json',
                        'Authorization': f'Bearer {api_key}',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                    payload = {
                        'model': model,
                        'messages': [
                            {'role': 'system', 'content': system_instruction},
                            {'role': 'user', 'content': user_content}
                        ],
                        'temperature': 0.1,
                        'response_format': {'type': 'json_object'}
                    }
                    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
                    with urllib.request.urlopen(req) as response:
                        res_data = json.loads(response.read().decode('utf-8'))
                        response_json = res_data['choices'][0]['message']['content']
                elif provider == 'gemini':
                    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
                    headers = {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                    payload = {
                        'contents': [
                            {
                                'role': 'user',
                                'parts': [{'text': f"{system_instruction}\n\n{user_content}"}]
                            }
                        ],
                        'generationConfig': {
                            'responseMimeType': 'application/json'
                        }
                    }
                    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
                    with urllib.request.urlopen(req) as response:
                        res_data = json.loads(response.read().decode('utf-8'))
                        response_json = res_data['candidates'][0]['content']['parts'][0]['text']
                
                # Strip markdown code blocks if the LLM generated them
                clean_json = response_json.strip()
                if clean_json.startswith("```"):
                    clean_json = clean_json.replace("```json", "", 1).replace("```", "", 1).strip()
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(clean_json.encode('utf-8'))
                
            except urllib.error.HTTPError as e:
                err_msg = e.read().decode('utf-8')
                print(f"API HTTPError {e.code}: {err_msg}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f"API Error {e.code}: {err_msg}"}).encode('utf-8'))
            except Exception as e:
                import traceback
                print("Server exception occurred:")
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': f"Server Proxy Error: {str(e)}"}).encode('utf-8'))
        else:
            super().do_POST()

# Serve static files from current directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print(f"Serving on port {PORT} with API proxy...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
