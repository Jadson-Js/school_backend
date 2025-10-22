Claro, ótima ideia. Adicionar uma referência a um arquivo de especificação formal (como um YAML OpenAPI) é uma excelente prática.

Eu vou inserir essa informação logo no início da seção "Documentação da API".

Aqui está o `README.md` atualizado:

````markdown
# Gerador de Planos de Aula com IA (Teste Técnico)

Este projeto é um sistema full-stack que gera planos de aula personalizados utilizando a API do Google Gemini. O backend é construído com Supabase (Banco de Dados, Autenticação e Edge Functions) e o frontend com Next.js.

O sistema permite que professores autenticados insiram parâmetros-chave (como tópico, matéria e ano escolar) e recebam um plano de aula completo, estruturado com uma introdução lúdica, objetivos da BNCC, um passo a passo detalhado e uma rubrica de avaliação.

## Acesso e Demonstração

Você pode testar a aplicação ao vivo e navegar pelos repositórios e pelo projeto Supabase abaixo.

- **URL da Aplicação (Vercel):** [school-frontend-ihsi.vercel.app](https://school-frontend-ihsi.vercel.app)

### Credenciais de Teste

- **Email:** `jadson20051965@gmail.com`
- **Senha:** `admin123`

### Repositórios

- **Frontend (Next.js):** [github.com/Jadson-Js/school_frontend](https://github.com/Jadson-Js/school_frontend)
- **Backend (Supabase):** [github.com/Jadson-Js/school_backend](https://github.com/Jadson-Js/school_backend)

---

### 🖼️ Demonstração Visual

#### Fluxo Completo de Uso

(Um GIF demonstrando todo o processo: login, preenchimento do formulário, estado de carregamento e visualização do resultado.)

![Fluxo Completo da Aplicação](./docs/images/SEU_GIF_DE_FLUXO_COMPLETO.gif)

---

#### Telas Principais

Aqui estão os componentes visuais chave da aplicação, desde a autenticação até o dashboard principal.

|           Autenticação (Login)            |            Autenticação (Cadastro)            |             Dashboard Principal              |
| :---------------------------------------: | :-------------------------------------------: | :------------------------------------------: |
| ![Tela de Login](./docs/images/login.png) | ![Tela de Cadastro](./docs/images/signup.png) | ![Tela da Dashboard](./docs/images/home.png) |

---

#### Resultado Final (Plano de Aula)

O plano de aula completo é exibido em um formato limpo após o processamento da IA, pronto para o professor utilizar.

![Demonstração do Resultado Final](./docs/images/demonstration.gif)

---

## 🛠️ Stack Tecnológica

| **Área**           | **Tecnologias Utilizadas**                            |
| ------------------ | ----------------------------------------------------- |
| **Frontend**       | Next.js, React, Fetch API                             |
| **Backend**        | Supabase (Database, Auth, Edge Functions), PostgreSQL |
| **Infra & Deploy** | Vercel (Frontend)                                     |
| **IA & APIs**      | Google Gemini API (modelo `Gemini-2.0-flash`)         |
| **Linguagens**     | TypeScript, `plpgsql`                                 |

---

## ⚙️ Instruções de Instalação e Execução

Para executar este projeto localmente, você precisará de dois terminais: um para o backend (Supabase CLI) e um para o frontend (Next.js).

### Pré-requisitos

- [Node.js](https://nodejs.org/en/) (v18 ou superior)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Conta no [Google AI Studio](https://aistudio.google.com/) para gerar uma `GEMINI_API_KEY`.

---

### 1. Backend (Supabase)

O backend é gerenciado pelo Supabase CLI, que roda o ambiente Supabase localmente em containers Docker.

Bash

#

`# 1. Clone o repositório do backend
git clone https://github.com/Jadson-Js/school_backend.git
cd school_backend

# 2. Inicie os serviços do Supabase

# (Isso irá baixar as imagens Docker e iniciar o studio local)

supabase start

# 3. Aplique as migrações do banco de dados

# O script SQL da tabela lesson_plans está em /supabase/migrations

supabase db reset

# 4. Configure sua chave da API do Gemini como um Secret

# Substitua SUA_CHAVE_AQUI pela sua chave real

supabase secrets set GEMINI_API_KEY=SUA_CHAVE_AQUI

# 5. Faça o deploy da Edge Function (que chama a API do Gemini)

supabase functions deploy gerador-plano-aula --no-verify-jwt

# 6. (Opcional) Vincule a um projeto Supabase remoto

# supabase login

# supabase link --project-ref [SEU_PROJECT_REF]

# supabase db push # Para enviar as migrações para o projeto remoto`

Ao final do `supabase start`, o terminal exibirá as chaves de API locais (`API URL`, `anon key`, `service_role key`). Você usará a `API URL` e a `anon key` no próximo passo.

---

### 2. Frontend (Next.js)

Bash

#

`# 1. Clone o repositório do frontend em outro terminal
git clone https://github.com/Jadson-Js/school_frontend.git
cd school_frontend

# 2. Instale as dependências

npm install

# 3. Crie o arquivo de variáveis de ambiente

cp .env.example .env

# 4. Edite o .env.local com as chaves do Supabase

# Use as chaves fornecidas pelo comando "supabase start"

NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI...`

### 3. Executando o Projeto

1. **Backend:** Certifique-se de que o `supabase start` esteja rodando.
2. **Frontend:** No diretório `school_frontend`, execute:Bash

   `npm run dev`

Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🧠 Decisões Técnicas e Arquitetura

Esta seção detalha as principais decisões de arquitetura tomadas para garantir um sistema seguro, performático e escalável.

### 1. Modelo de IA: `Gemini-2.0-flash`

Escolhi o modelo **Gemini 2.0 Flash** após análise no Google AI Studio. Embora o 1.5 Pro seja poderoso, o 2.0 Flash oferece o equilíbrio ideal para esta aplicação: tempo de resposta significativamente mais rápido com uma qualidade de elaboração de texto superior ao `flash-lite`, garantindo uma excelente experiência do usuário sem longos esperas.

### 2. Armazenamento de Dados: Coluna Única `jsonb`

Em vez de criar múltiplas colunas de texto (`introducao_ludica`, `objetivo_bncc`, etc.), optei por uma única coluna `generated_content` do tipo `jsonb`.

- **Vantagem:** Esta abordagem é drasticamente mais performática e flexível. Ela permite que a estrutura da resposta da IA evolua sem a necessidade de migrações de banco de dados (ALTER TABLE), e consultar dados aninhados em `jsonb` é altamente eficiente no PostgreSQL.

### 3. Backend: Supabase Edge Function vs. Next.js API Route

A chamada para a API do Gemini é feita em uma **Supabase Edge Function** (`gerador-plano-aula`), e não em uma API Route do Next.js.

- **Por quê?** Segurança em primeiro lugar. A `GEMINI_API_KEY` é armazenada com segurança nos **Supabase Secrets** e só é acessível pela Edge Function. Isso evita completamente que a chave seja exposta no lado do cliente ou mesmo no ambiente do Next.js, centralizando a lógica de IA sensível no backend.

### 4. Segurança: Row Level Security (RLS)

A tabela `lesson_plans` tem o RLS ativado.

- **Implementação:** Foram criadas políticas (`POLICY`) que garantem que um usuário autenticado (`auth.uid()`) só possa criar, ler, atualizar ou deletar os planos de aula que estão vinculados ao seu próprio `user_id`.

### 5. Frontend: Next.js

A escolha pelo Next.js foi estratégica. Além de um ecossistema robusto de ferramentas (roteamento), ele simplifica o deploy para produção (como na Vercel) e facilita a integração com o Supabase para o fluxo de autenticação (Client-Side e Server-Side).

---

## 🧪 Estratégia de Testes (Unitários e de Integração)

Para garantir a confiabilidade e a robustez da lógica de negócios, uma estratégia de testes foi implementada, cobrindo as camadas críticas da aplicação: o banco de dados e as funções de backend.

#### 1. Testes de Banco de Dados (com `pgTAP`)

Utilizei a extensão `pgTAP` para criar testes unitários diretamente no PostgreSQL. Esta abordagem foi crucial para validar a lógica e a integridade dos dados na camada mais fundamental.

- **Validação de Triggers:** Testes que asseguram o funcionamento de triggers essenciais, como:
  - A criação automática de um `profile` para um novo usuário (`auth.users`).
  - A atualização correta do campo `updated_at` em todas as tabelas.
- **Validação de Funções `plpgsql`:** Testes que verificam a lógica de funções SQL customizadas, garantindo que elas retornem os dados esperados e manipulem transações corretamente.

#### 2. Testes de Edge Functions (com Deno Test)

A Edge Function `generate_lesson_plans` foi testada usando o _runner_ de testes nativo do Deno, focando em sua interação com a API externa e seu papel como _gateway_.

- **Caminho Feliz (Happy Path):** Simula uma resposta bem-sucedida da API do Gemini, validando que a função:
  - Processa o JSON da IA corretamente.
  - Prepara os dados para a inserção no banco.
- **Tratamento de Falhas (Unhappy Path):** Testes que simulam falhas da API do Gemini (ex: JSON inválido, erro 500), garantindo que a Edge Function:
  - Capture esses erros (o `try...catch` mencionado na seção 'Desafios').
  - Retorne o status de erro HTTP apropriado para o frontend.

### 7. Persistência de Dados para Depuração e Análise

O sistema salva não apenas o _output_ da IA (`generated_content`), mas também os _inputs_ do usuário (`topic`, `grade_level`, etc.) e o _prompt_ exato que foi enviado (`prompt_debug`).

- **Vantagem:** Esta decisão é crítica para a manutenção e evolução do produto. Se um plano de aula for gerado com baixa qualidade, podemos depurar exatamente qual _prompt_ causou o problema e iterar em melhorias, além de permitir análises futuras sobre os temas mais pedidos.

---

## Desafios Encontrados e Soluções

O maior desafio deste projeto não foi a integração, mas sim a natureza da IA: a aleatoriedade e a garantia de consistência da resposta.

### Desafio: Garantir a Estabilidade e o Formato da Resposta da IA

A API do Gemini é poderosa, mas "criativa". Havia um risco de a IA:

1. Não retornar um JSON válido.
2. Retornar um JSON, mas com chaves faltantes ou nomes diferentes (ex: `introducao` em vez de `ludic_introduction`).
3. Demorar muito ou falhar (erro 500, 429).

### Solução: Uma Abordagem de "Contenção" em Múltiplas Camadas

Implementei uma arquitetura defensiva para lidar com essa instabilidade.

1. **Engenharia de Prompt (Prompt Engineering):** O prompt enviado à IA não apenas pede o conteúdo, mas _instrui rigorosamente_ sobre o formato de saída. Ele especifica que a resposta DEVE ser um objeto JSON, detalhando os nomes exatos das chaves e os tipos de dados esperados (ex: `step_by_step` deve ser um array de objetos).
2. **Validação na Edge Function (Backend):** A Edge Function atua como um portão de controle.
   - Ela envolve a chamada `JSON.parse()` em um bloco `try...catch`. Se o _parse_ falhar, a IA não retornou um JSON válido e um erro é retornado ao cliente.
   - Após o _parse_, ela valida a presença das chaves essenciais (`ludic_introduction`, `bncc_goal`, etc.). Se uma chave vital estiver faltando, a resposta é considerada insatisfatória e um erro é retornado.
3. **Tratamento de Erros (Frontend):** O frontend está preparado para falhas.
   - O botão "Gerar" exibe um estado de _loading_ para informar o usuário que o processamento está em andamento.
   - Qualquer erro retornado pela Edge Function (JSON inválido, erro da API do Gemini, falha no banco de dados) é capturado e exibido ao usuário através de uma notificação (toast/alert), permitindo que ele tente novamente.

---

## 🚀 Documentação da API (Endpoints)

A principal interação com o backend é feita através de uma única Edge Function do Supabase, que atua como o endpoint principal da API.

**Para uma especificação detalhada (OpenAPI), consulte o arquivo: [docs/endpoints.yaml](docs/endpoints.yaml)**

### POST /functions/v1/generate_lesson_plans

Cria e armazena um novo plano de aula gerado pela IA. Este endpoint é protegido e requer um token de autenticação (JWT) do usuário logado.

#### Headers Obrigatórios

| Header          | Descrição                                                               |
| --------------- | ----------------------------------------------------------------------- |
| `Authorization` | `Bearer <SEU_JWT_TOKEN_DE_USUÁRIO>` (Obtido após o login)               |
| `apikey`        | `<SUA_SUPABASE_ANON_KEY>` (A chave pública anônima do projeto Supabase) |
| `Content-Type`  | `application/json`                                                      |

#### Corpo da Requisição (Request Body)

Um objeto JSON contendo os parâmetros para a geração do plano.

```json
{
  "topic": "Fluxo da agua",
  "grade_level": "1° ano",
  "subject": "Ciência",
  "learning_context": "Sala de aula ao ar livre",
  "duration_minutes": "20"
}
```
````

#### Resposta de Sucesso (200 OK)

Retorna um objeto JSON com o status, o plano de aula completo salvo no banco (`lesson_plan_id`), o conteúdo da IA já parseado (`content`) e os metadados da requisição (`metadata`).

```json
{
  "success": true,
  "lesson_plan_id": {
    "id": 1,
    "created_at": "2025-10-21T20:02:56.03423+00:00",
    "updated_at": "2025-10-21T20:02:56.03423+00:00",
    "user_id": "96296a97-414a-4948-abd2-75e8646e975a",
    "topic": "Fluxo da agua",
    "grade_level": "1° ano",
    "subject": "Ciência",
    "learning_context": "Sala de aula ao ar livre",
    "duration_minutes": 20,
    "generated_content": "{ \"ludic_introduction\": \"...\", \"bncc_goal\": \"...\", ... }",
    "prompt_debug": "Você é um especialista em pedagogia..."
  },
  "content": {
    "ludic_introduction": "Começar a aula com a música \"Aquarela\" de Toquinho...",
    "bncc_goal": "(EF01CI04) Comparar características físicas...",
    "step_by_step": [
      {
        "etapa": "Observação inicial",
        "tempo": "5 minutos",
        "descricao": "Em círculo, com as crianças sentadas..."
      },
      {
        "etapa": "Experiência prática: ciclo da água simplificado",
        "tempo": "10 minutos",
        "descricao": "Demonstrar o ciclo da água de forma simples..."
      },
      {
        "etapa": "Registro e discussão",
        "tempo": "5 minutos",
        "descricao": "Pedir para as crianças desenharem o que observaram..."
      }
    ],
    "rubric_evaluation": {
      "excelente": "Demonstra excelente compreensão do ciclo da água...",
      "bom": "Demonstra boa compreensão do ciclo da água...",
      "satisfatorio": "Demonstra compreensão básica do ciclo da água...",
      "em_desenvolvimento": "Apresenta dificuldades na compreensão..."
    }
  },
  "metadata": {
    "topic": "Fluxo da agua",
    "grade_level": "1° ano",
    "subject": "Ciência",
    "learning_context": "Sala de aula ao ar livre",
    "duration_minutes": "20",
    "created_at": "2025-10-21T20:02:56.168Z"
  }
}
```

#### Resposta de Erro

Conforme descrito na seção "Desafios", a função trata erros e retorna um JSON com a falha.

```json
{
  "success": false,
  "error": "Descrição do erro (ex: Falha ao validar o corpo da requisição, Erro da API do Gemini, JSON inválido retornado pela IA, etc.)"
}
```

### Exemplo de Requisição (cURL)

Este é um exemplo de `cURL` para testar o endpoint. Substitua a URL pela do seu projeto (local ou produção) e as chaves de `Authorization` e `apikey`.

```bash
curl --request POST \
  --url '[https://ckxwzvxcibtmzzyeczln.supabase.co/functions/v1/generate_lesson_plans](https://ckxwzvxcibtmzzyeczln.supabase.co/functions/v1/generate_lesson_plans)' \
  --header 'Authorization: Bearer <SEU_JWT_TOKEN_DE_USUÁRIO>' \
  --header 'apikey: <SUA_SUPABASE_ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
	"topic": "Fluxo da agua",
	"grade_level": "1° ano",
	"subject": "Ciência",
	"learning_context": "Sala de aula ao ar livre",
	"duration_minutes": "20"
}'
```

---

## 📋 Schema do Banco de Dados

A arquitetura de dados é centrada em uma única tabela principal, `lesson_plans`.

### Scripts SQL

**Criação da Tabela:**

```sql
CREATE TABLE PUBLIC.profiles (
  user_id UUID NOT NULL DEFAULT auth.UID(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE PUBLIC.lesson_plans (
  id BIGINT GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL DEFAULT auth.UID(),
  topic TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  subject TEXT NOT NULL,
  learning_context TEXT,
  duration_minutes SMALLINT,
  generated_content JSONB NOT NULL,
  prompt_debug TEXT NOT NULL,
  CONSTRAINT lesson_plans_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

**Políticas de Segurança (RLS):**

SQL

```sql
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enable read access for all users"
ON public.profiles
AS permissive
FOR SELECT
TO public
USING (true);

CREATE POLICY "enable insert for users based on user_id"
ON public.profiles
AS permissive
FOR INSERT
TO public
WITH CHECK (
  (auth.uid() = user_id)
  AND
  ((SELECT email_confirmed_at FROM auth.users WHERE id = auth.uid()) IS NOT NULL)
);

CREATE POLICY "enable update access based on user_id"
ON public.profiles
AS permissive
FOR UPDATE
TO public
USING ((auth.uid() = user_id))
WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "allow full access for authenticated users on their own plans"
ON public.lesson_plans
AS permissive
FOR ALL
TO public
USING ((auth.uid() = user_id))
WITH CHECK ((auth.uid() = user_id));
```

```

```
