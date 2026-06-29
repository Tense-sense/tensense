from http.server import BaseHTTPRequestHandler
import json
import urllib.request
import urllib.error
import os

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            req_data = json.loads(post_data.decode('utf-8'))
        except Exception as ex:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': f"Invalid JSON payload: {str(ex)}"}).encode('utf-8'))
            return

        # Load local env if exists (for local test setups), otherwise rely on Vercel environment variables
        env = {}
        if os.path.exists('.env'):
            try:
                with open('.env', 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            k, v = line.split('=', 1)
                            env[k.strip()] = v.strip()
            except Exception:
                pass

        api_key = os.environ.get('TENSENSEGROQ') or os.environ.get('tensensegroq') or os.environ.get('GROQ_API_KEY') or env.get('TENSENSEGROQ') or env.get('tensensegroq') or env.get('GROQ_API_KEY')
        model = req_data.get('model', 'llama-3.3-70b-versatile')
        tense = req_data.get('tense')
        prompt = req_data.get('prompt')
        sentence = req_data.get('sentence')
        
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
        
        try:
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
            
            clean_json = response_json.strip()
            if clean_json.startswith("```"):
                clean_json = clean_json.replace("```json", "", 1).replace("```", "", 1).strip()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(clean_json.encode('utf-8'))
            
        except urllib.error.HTTPError as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            err_msg = e.read().decode('utf-8')
            self.wfile.write(json.dumps({'error': f"API Error {e.code}: {err_msg}"}).encode('utf-8'))
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': f"Server Proxy Error: {str(e)}"}).encode('utf-8'))
