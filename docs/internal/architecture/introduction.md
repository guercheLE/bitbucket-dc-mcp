# Introduction

Este documento descreve a arquitetura completa do **Bitbucket DataCenter MCP Server**, incluindo sistemas backend, integração com Model Context Protocol (MCP), busca semântica inteligente, e estratégias de deployment. Serve como fonte única de verdade para desenvolvimento orientado por IA, garantindo consistência em toda a stack tecnológica.

Esta abordagem unificada combina o que tradicionalmente seriam documentos separados de arquitetura backend e frontend, otimizando o processo de desenvolvimento para aplicações modernas onde backend CLI e integração com LLMs são o core do produto.

### Starter Template or Existing Project

**N/A - Projeto Greenfield**

Este é um projeto novo desenvolvido do zero, sem base em templates existentes. As decisões arquiteturais são tomadas especificamente para atender aos requisitos únicos de:
- Integração MCP (Model Context Protocol) via stdio transport
- Busca semântica de alta precisão (>90%) usando embeddings vetoriais
- Performance crítica (<500ms p95 para search, <2s para call)
- Deployment flexível (Docker, npm, bare metal)

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-15 | 1.0 | Documento de arquitetura inicial baseado no PRD v1.0 | Winston (Architect) 🏗️ |

