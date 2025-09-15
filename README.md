# tic_tac_toe_python
This is my first flask API for a python tic-tac-toe game.
Using the POST method, Postman is used to communicate data to a server.
We provide players' names and symbol data first, followed by player symbol, row, and column position until the game is over or a winner is found.
This is how we use Postman to send details in json:

STEP:1

http://192.168.29.240:3000/details

{
    "player1":"vivek"
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

The `frontend/` folder contains a standalone web experience that creates a 3D, glassmorphism-inspired interface for a UK house survey assistant. The interface allows surveyors to upload an inspection image, describe an observed issue, and receive AI-style narrative guidance aligned with the RICS Home Survey Standard.

### Previewing the interface

Open the static page directly in your browser or serve it locally:

```bash
cd frontend
python -m http.server 8000
```

Then visit http://localhost:8000 in your browser. The interactive card surfaces respond to mouse movement for a parallax 3D effect while the analysis panel generates condition ratings and references tailored to the input narrative.
