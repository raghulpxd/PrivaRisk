import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
import chromadb

# Allow overriding embeddings model and chroma path via env
EMBEDDINGS_MODEL = os.getenv("OLLAMA_EMBEDDINGS_MODEL", "nomic-embed-text:latest")
embeddings = OllamaEmbeddings(model=EMBEDDINGS_MODEL)
CHROMA_PATH = os.getenv("CHROMA_PATH", "./chroma_db")

def ingest_pdf(filepath: str, doc_id: str) -> dict:
    loader = PyPDFLoader(filepath)
    documents = loader.load()
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.split_documents(documents)
    
    Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name=doc_id,
        persist_directory=CHROMA_PATH
    )
    
    return {
        "doc_id": doc_id,
        "chunks_stored": len(chunks),
        "pages": len(documents),
        "status": "ready"
    }

def query_document(doc_id: str, question: str, top_k: int = 5) -> str:
    vectorstore = Chroma(
        collection_name=doc_id,
        embedding_function=embeddings,
        persist_directory=CHROMA_PATH
    )
    docs = vectorstore.as_retriever(search_kwargs={"k": top_k}).invoke(question)
    return "\n\n---\n\n".join([doc.page_content for doc in docs])

def query_all_documents(question: str, top_k: int = 5) -> str:
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collections = client.list_collections()
    all_context = []
    
    for collection in collections:
        try:
            vs = Chroma(
                collection_name=collection.name,
                embedding_function=embeddings,
                persist_directory=CHROMA_PATH
            )
            docs = vs.as_retriever(search_kwargs={"k": 2}).invoke(question)
            for doc in docs:
                all_context.append(f"[From: {collection.name}]\n{doc.page_content}")
        except:
            pass
    
    return "\n\n---\n\n".join(all_context[:top_k])