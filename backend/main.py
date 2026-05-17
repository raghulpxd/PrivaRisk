from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io, os, uuid, sys

sys.path.append(os.path.dirname(__file__))

from services.llm_service import ask_llm
from services.rag_service import ingest_pdf, query_document, query_all_documents
from services.fraud_service import analyze_transactions, get_summary_stats

app = FastAPI(title="PrivateFinAI")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup_event():
    os.makedirs("data/uploads", exist_ok=True)

current_df = None

@app.get("/api/health")
async def health():
    return {"status": "running", "model": "mistral:7b", "data_loaded": current_df is not None}

@app.post("/api/transactions/upload")
async def upload_transactions(file: UploadFile = File(...)):
    global current_df
    content = await file.read()
    current_df = pd.read_csv(io.BytesIO(content))
    current_df = analyze_transactions(current_df)
    stats = get_summary_stats(current_df)
    flagged = current_df[current_df['anomaly_flag'] == -1].head(50)
    return {"stats": stats, "flagged_transactions": flagged.fillna(0).to_dict(orient='records')}

@app.post("/api/transactions/explain")
async def explain_transaction(txn: dict):
    message = f"""Analyze this flagged transaction:
- Amount: ${txn.get('amount', 0):,.2f}
- Risk Score: {txn.get('risk_score_normalized', 0)}/100
- Risk Level: {txn.get('risk_level', 'UNKNOWN')}
- Patterns: {txn.get('patterns', 'NONE')}
- Type: {txn.get('type', 'UNKNOWN')}"""
    result = await ask_llm("fraud", message)
    return {"explanation": result}

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    filepath = f"data/uploads/{doc_id}.pdf"
    with open(filepath, "wb") as f:
        f.write(await file.read())
    result = ingest_pdf(filepath, doc_id)
    return result

@app.post("/api/documents/query")
async def query_doc(doc_id: str = Form(None), question: str = Form(...)):
    context = query_document(doc_id, question) if doc_id else query_all_documents(question)
    answer = await ask_llm("document", question, context)
    return {"answer": answer}

@app.post("/api/documents/query-all")
async def query_all_docs(question: str = Form(...)):
    context = query_all_documents(question)
    answer = await ask_llm("document", question, context)
    return {"answer": answer}

@app.post("/api/chat")
async def chat(message: str):
    try:
        global current_df
        context = ""
        if current_df is not None:
            stats = get_summary_stats(current_df)
            context = f"""Transaction Database Summary:
- Total: {stats['total_transactions']}
- Flagged: {stats['flagged_count']}
- High Risk: {stats['high_risk']}
- Volume: ${stats['total_volume']:,.2f}
- Patterns: {stats['top_patterns']}"""
        
        doc_context = query_all_documents(message)
        if doc_context:
            context += f"\n\nDocument Context:\n{doc_context}"
        
        try:
            answer = await ask_llm("chat", message, context)
        except Exception as exc:
            return {"response": f"LLM unavailable: {exc}"}
        return {"response": answer}
    except Exception as e:
        # catch any unexpected server-side error
        return {"response": f"Server error: {e}"}

@app.post("/api/reports/generate")
async def generate_report():
    global current_df
    if current_df is None:
        return {"error": "No transaction data loaded"}
    stats = get_summary_stats(current_df)
    message = f"Generate a formal daily compliance report based on these stats: {stats}"
    report = await ask_llm("report", message)
    return {"report": report}

@app.post("/api/reports/query")
async def query_reports(data: dict):
    query = data.get("query", "")
    if not query:
        return {"result": "No query provided"}
    result = await ask_llm("compliance", query)
    return {"result": result}