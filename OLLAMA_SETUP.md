# Ollama and Mistral 7B Installation Guide

This guide will help you install Ollama and run the Mistral 7B model locally.

## 1. Install Ollama

Ollama allows you to run robust large language models locally.

### On Windows
1. Download the Ollama Windows installer from the official website: [Ollama Windows Download](https://ollama.com/download/windows)
2. Run the installer and follow the on-screen instructions.

### On macOS
1. Download the macOS app from: [Ollama macOS Download](https://ollama.com/download/mac)
2. Extract the app and drag it to your Applications folder.

### On Linux
Run the following command in your terminal:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

## 2. Verify Installation
Open a new terminal (Command Prompt, PowerShell, or Terminal) and run:
```bash
ollama --version
```
This should output the installed version of Ollama.

## 3. Download and Run Mistral 7B
Once Ollama is installed and running, you can pull and run the Mistral 7B model.

In your terminal, run:
```bash
ollama run mistral
```

- This command will automatically download the Mistral 7B model if it's not already on your system (the download size is around 4.1GB).
- After the download completes, you will be placed into an interactive prompt where you can chat with the Mistral model.
- To exit the interactive prompt, type `/bye` or press `Ctrl + d`.

## 4. Using the API (Optional)
Ollama provides a local API running on `http://localhost:11434`. You can test it using curl:

```bash
curl -X POST http://localhost:11434/api/generate -d '{
  "model": "mistral",
  "prompt": "Why is the sky blue?"
}'
```

Now your local environment is set up to run Mistral via Ollama!
