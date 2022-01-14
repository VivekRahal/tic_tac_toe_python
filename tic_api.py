from flask import Flask, request
from tic_tac_toe_code import player_details, play_game, table

app = Flask(__name__)

game_players_details = []


@app.route("/details", methods=["POST"])
def details():
    players_details = request.get_json(force=True)
    game_players_details.append(players_details["player1"])
    game_players_details.append(players_details["symbol1"])
    game_players_details.append(players_details["player2"])
    game_players_details.append(players_details["symbol2"])

    return f"Players_Names: {players_details['player1'], players_details['player2']} \n" \
           f"Players_symbol: {players_details['symbol1'], players_details['symbol2']}"


@app.route("/play", methods=["POST"])
def play():
    player_game = request.get_json(force=True)

    winner = player_details(game_players_details[0], game_players_details[1], game_players_details[2],
                            game_players_details[3])

    if winner == game_players_details[1]:
        return f"The winner of the game 'TIC-Tac-Toa' is '{game_players_details[0]}' \n" \
               f"{game_players_details.clear()}"
    elif winner == game_players_details[3]:
        return f"The winner of the game 'TIC-Tac-Toa' is '{game_players_details[2]}' \n" \
               f"{game_players_details.clear()}"

    if any("_" in sublist for sublist in table):
        if player_game["symbol"] == game_players_details[1]:
            if [player_game["row"], player_game["column"]] not in [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2],
                                                                   [2, 0], [2, 1],
                                                                   [2, 2]]:
                return f"invalid input give correct position"
            else:
                if table[player_game["row"]][player_game["column"]] == "_":
                    play_game(player_game["symbol"], player_game["row"], player_game["column"])
                    return f"{game_players_details[2]} play your game"
                else:
                    return f"position is already filled"
        elif player_game["symbol"] == game_players_details[3]:
            if [player_game["row"], player_game["column"]] not in [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2],
                                                                   [2, 0], [2, 1],
                                                                   [2, 2]]:
                return f"invalid input give correct position"
            else:
                if table[player_game["row"]][player_game["column"]] == "_":
                    play_game(player_game["symbol"], player_game["row"], player_game["column"])
                    return f"{game_players_details[0]} play your game"
                else:
                    return f"position is already filled"
        else:
            return f"please enter the correct symbol"
    else:
        return f"Game Tie...."


app.run(host="0.0.0.0", port=3000, debug=True)
