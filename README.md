# survey
This is my first flask API for a python tic-tac-toe game.
Using the POST method, Postman is used to communicate data to a server.
We provide players' names and symbol data first, followed by player symbol, row, and column position until the game is over or a winner is found.

This is how we use Postman to send details in json:

STEP:1

http://192.168.29.240:3000/details

{
    "player1":"vivek",
    "symbol1":"x",
    "player2":"karan",
    "symbol2":"o"
}


if status is 200 ok then.🆗


STEP:2


http://192.168.29.240:3000/play


{
    "symbol":"x",
    "row":2,
    "column":1
}


if symbol and position entered are correct then staus will be 200 ok🆗 and again repeat step 2 with different positons untill the game drawn or finds the winner.

---

## UK House Survey Visual Advisor

The `frontend-vue/` folder contains a Vue 3 + Vite experience that recreates the 3D, glassmorphism-inspired interface for the UK house survey assistant. Surveyors can upload an inspection image, describe an observed issue, and receive narrative guidance aligned with the RICS Home Survey Standard.

### Local development

Install dependencies and start the Vite development server:

```bash
cd frontend-vue
npm install
npm run dev
```

Visit the URL shown in the terminal (typically http://localhost:5173) to interact with the interface. The card surfaces respond to mouse movement for a parallax 3D effect, while the analysis panel generates condition ratings and references tailored to the inspection narrative.

### Production build

Create an optimized build suitable for deployment:

```bash
npm run build
```

The output will be placed in `frontend-vue/dist`. You can optionally verify the production bundle locally with `npm run preview` after building.

### Legacy static prototype

The original static prototype remains in `frontend/` for reference. It mirrors the Vue implementation but is no longer the primary entry point for development.

## Docker (compose) quick start

This repo ships with containerization for all services: Frontend (Nginx), Backend (FastAPI/Uvicorn), MongoDB, and Ollama.

Prerequisites:
- Docker and Docker Compose

Run everything:
```bash
cd survey
docker compose up --build
```

Open:
- Frontend: http://localhost:8080
- Backend API: http://localhost:8000
- Ollama (for debugging): http://localhost:11434

Notes:
- The first image analysis triggers an automatic model pull (llava:7b) inside the `ollama` container; this can take several minutes on first run.
- The frontend proxies `/api/*` to the backend, so browser calls are same‑origin and CORS is not required.
- To change the model or endpoints, set env vars in compose: `OLLAMA_MODEL`, `OLLAMA_URL`, `MONGODB_URI`, `JWT_SECRET`.
