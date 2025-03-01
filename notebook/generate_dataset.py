#!/usr/bin/env python3
"""
Simple script to preprocess PHH files and save as JSON for notebook use.
This lightweight script extracts data from PHH files and creates a JSON file that
can be easily loaded in a Jupyter notebook for GRPO training.
"""

import os
import re
import glob
import json
import argparse
from pathlib import Path
from tqdm import tqdm


class PHHPreprocessor:
    def __init__(
        self,
        base_phh_path="/Users/maxforsey/Downloads/pluribus",
        target_folders=["30", "40", "50", "70", "90"],
    ):
        """
        Initialize the PHH preprocessor

        Args:
            base_phh_path: Base path where pluribus folders are located
            target_folders: List of folder names to process
        """
        self.base_path = Path(base_phh_path)
        self.target_folders = target_folders
        self.data = []
        self.card_values = {
            "2": 2,
            "3": 3,
            "4": 4,
            "5": 5,
            "6": 6,
            "7": 7,
            "8": 8,
            "9": 9,
            "T": 10,
            "J": 11,
            "Q": 12,
            "K": 13,
            "A": 14,
        }
        self.card_suits = {"c": "clubs", "d": "diamonds", "h": "hearts", "s": "spades"}

    def load_phh_files(self, max_files_per_folder=None):
        """
        Load PHH files from target folders

        Args:
            max_files_per_folder: Optional limit on files per folder (for quick testing)
        """
        for folder in self.target_folders:
            folder_path = self.base_path / folder
            if not folder_path.exists():
                print(f"Warning: Folder {folder_path} does not exist")
                continue

            phh_files = list(folder_path.glob("*.phh"))
            if max_files_per_folder:
                phh_files = phh_files[:max_files_per_folder]

            print(f"Processing {len(phh_files)} PHH files in {folder}")

            for phh_file in tqdm(phh_files, desc=f"Processing folder {folder}"):
                try:
                    phh_data = self.parse_phh_file(phh_file)
                    if phh_data:
                        self.data.append(phh_data)
                except Exception as e:
                    print(f"Error processing {phh_file}: {e}")

        print(f"Total PHH files processed: {len(self.data)}")
        return self.data

    def parse_phh_file(self, file_path):
        """
        Parse a single PHH file

        Args:
            file_path: Path to the PHH file

        Returns:
            dict: Parsed PHH data
        """
        with open(file_path, "r") as f:
            content = f.read()

        # Create a dictionary to store all the data
        data = {}

        # Extract key data using regex patterns
        for line in content.split("\n"):
            if "=" in line:
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip()

                # Convert to appropriate types
                if value.startswith("[") and value.endswith("]"):
                    # Handle lists
                    value = value[1:-1]  # Remove brackets
                    if value:  # Check if the list is not empty
                        value = [item.strip() for item in value.split(",")]

                        # Convert to integers if possible
                        try:
                            value = [
                                int(item)
                                if item.strip("'\"").isdigit()
                                else item.strip("'\"")
                                for item in value
                            ]
                        except:
                            pass
                    else:
                        value = []
                elif value.isdigit():
                    # Convert to integer
                    value = int(value)
                elif value.lower() in ("true", "false"):
                    # Convert to boolean
                    value = value.lower() == "true"
                elif value.startswith("'") and value.endswith("'"):
                    # Remove quotes
                    value = value[1:-1]

                data[key] = value

        # Parse actions separately as they require special handling
        if "actions" in data:
            parsed_actions = self.parse_actions(data["actions"])
            data["parsed_actions"] = parsed_actions

        return data

    def parse_actions(self, actions):
        """
        Parse poker actions from the PHH file

        Args:
            actions: List of action strings

        Returns:
            list: Parsed actions with readable format
        """
        parsed_actions = []

        for action in actions:
            parts = action.split()

            if parts[0] == "d" and parts[1] == "dh":
                # Deal hole cards action
                player = parts[2]
                cards = parts[3]
                card1 = self.parse_card(cards[:2])
                card2 = self.parse_card(cards[2:])
                parsed_actions.append(
                    {
                        "type": "deal_hole_cards",
                        "player": player,
                        "cards": [card1, card2],
                    }
                )
            elif parts[0] == "d" and parts[1] == "db":
                # Deal board cards action
                cards = []
                for i in range(2, len(parts)):
                    cards.append(self.parse_card(parts[i]))
                parsed_actions.append({"type": "deal_board", "cards": cards})
            elif "f" in parts:
                # Fold action
                player = parts[0]
                parsed_actions.append({"type": "fold", "player": player})
            elif "cc" in parts:
                # Check/call action
                player = parts[0]
                parsed_actions.append({"type": "check_call", "player": player})
            elif "cbr" in parts:
                # Raise action
                player = parts[0]
                amount = int(parts[2])
                parsed_actions.append(
                    {"type": "raise", "player": player, "amount": amount}
                )
            elif "sm" in parts:
                # Show cards action
                player = parts[0]
                cards = []
                if len(parts) > 2:
                    cards_str = parts[2]
                    card1 = self.parse_card(cards_str[:2])
                    card2 = self.parse_card(cards_str[2:])
                    cards = [card1, card2]
                parsed_actions.append(
                    {"type": "show_cards", "player": player, "cards": cards}
                )

        return parsed_actions

    def parse_card(self, card_str):
        """
        Parse a card string (e.g., 'Ah' for Ace of hearts)

        Args:
            card_str: Card string in format 'Vs' where V is value and s is suit

        Returns:
            dict: Card representation
        """
        if len(card_str) != 2:
            return None

        value = card_str[0]
        suit = card_str[1]

        return {
            "value": value,
            "suit": suit,
            "value_int": self.card_values.get(value, 0),
            "suit_name": self.card_suits.get(suit, ""),
        }

    def convert_to_training_input(self, phh_data, player_perspective="Pluribus"):
        """
        Convert PHH data to training input format

        Args:
            phh_data: Parsed PHH data
            player_perspective: Perspective to generate training examples from

        Returns:
            list: List of training examples
        """
        training_examples = []

        # Skip if player is not in the game
        if player_perspective not in phh_data.get("players", []):
            return training_examples

        # Get player index
        player_idx = phh_data["players"].index(player_perspective)
        player_position = f"p{player_idx + 1}"

        # Extract hole cards for the player
        hole_cards = None
        for action in phh_data.get("parsed_actions", []):
            if (
                action["type"] == "deal_hole_cards"
                and action["player"] == player_position
            ):
                hole_cards = action["cards"]
                break

        if not hole_cards:
            return training_examples

        # Create game state
        game_state = {
            "hand_number": phh_data.get("hand", 0),
            "players": phh_data.get("players", []),
            "blinds": phh_data.get("blinds_or_straddles", []),
            "starting_stacks": phh_data.get("starting_stacks", []),
            "my_position": player_position,
            "my_hole_cards": hole_cards,
            "board_cards": [],
            "pot_size": sum(phh_data.get("blinds_or_straddles", [])),
            "current_bet": max(phh_data.get("blinds_or_straddles", [0])),
            "actions_history": [],
        }

        # Track the game state through the actions
        training_examples_generated = 0

        for i, action in enumerate(phh_data.get("parsed_actions", [])):
            # Update game state based on action
            if action["type"] == "deal_board":
                game_state["board_cards"].extend(action["cards"])

            elif action["type"] in ["fold", "check_call", "raise"]:
                # Record action in history
                game_state["actions_history"].append(action)

                # If this is our player's action, create a decision point
                if action["player"] == player_position:
                    # This is a decision point that we need for training
                    current_state = game_state.copy()
                    current_state["actions_history"] = current_state["actions_history"][
                        :-1
                    ]  # Remove current action

                    # Create training example
                    example = {
                        "game_state": current_state,
                        "action_taken": action,
                        "subsequent_actions": phh_data.get("parsed_actions", [])[
                            i + 1 :
                        ],
                        "result": {
                            "starting_stack": phh_data.get("starting_stacks", [])[
                                player_idx
                            ]
                            if player_idx < len(phh_data.get("starting_stacks", []))
                            else 0,
                            "finishing_stack": phh_data.get("finishing_stacks", [])[
                                player_idx
                            ]
                            if player_idx < len(phh_data.get("finishing_stacks", []))
                            else 0,
                        },
                    }

                    training_examples.append(example)
                    training_examples_generated += 1

                # Update pot size and current bet if action is raise
                if action["type"] == "raise":
                    game_state["pot_size"] += action["amount"]
                    game_state["current_bet"] = action["amount"]

        if training_examples_generated > 0:
            print(
                f"Generated {training_examples_generated} training examples from hand {phh_data.get('hand', 0)}"
            )
        return training_examples

    def generate_prompt(self, training_example):
        """
        Generate a prompt for the Qwen model based on a training example

        Args:
            training_example: A training example generated from PHH data

        Returns:
            str: Formatted prompt
        """
        game_state = training_example["game_state"]

        # Format hole cards
        hole_cards_str = self.format_cards(game_state["my_hole_cards"])

        # Format board cards
        board_cards_str = self.format_cards(game_state["board_cards"])
        if not board_cards_str:
            board_cards_str = "No community cards yet"

        # Format action history
        action_history = []
        for action in game_state["actions_history"]:
            if action["type"] == "fold":
                action_history.append(f"{action['player']} folds")
            elif action["type"] == "check_call":
                action_history.append(f"{action['player']} checks/calls")
            elif action["type"] == "raise":
                action_history.append(
                    f"{action['player']} raises to {action['amount']}"
                )

        action_history_str = (
            "\n".join(action_history) if action_history else "No previous actions"
        )

        # Calculate pot odds if relevant
        pot_odds_str = ""
        if game_state["current_bet"] > 0:
            pot_odds = game_state["pot_size"] / game_state["current_bet"]
            pot_odds_str = f"Pot odds: {pot_odds:.2f}:1"

        # Format prompt
        prompt = f"""You are playing a No-Limit Texas Hold'em poker game.
Hand Information:
- Hand #: {game_state["hand_number"]}
- Your position: {game_state["my_position"]}
- Your hole cards: {hole_cards_str}
- Community cards: {board_cards_str}
- Current pot size: {game_state["pot_size"]}
- Current bet to call: {game_state["current_bet"]}
{pot_odds_str}
Player stacks:
"""

        # Add player stacks
        for i, player in enumerate(game_state["players"]):
            if i < len(game_state["starting_stacks"]):
                prompt += f"- {player} ({game_state['players'].index(player) + 1}): {game_state['starting_stacks'][i]}\n"

        prompt += f"""
Action history:
{action_history_str}
What is your next action? Choose from:
1. Fold
2. Call/Check
3. Raise to [amount]
Analyze the situation and explain your reasoning before making a decision.
"""

        return prompt

    def format_cards(self, cards):
        """Format cards list into readable string"""
        if not cards:
            return ""

        card_strs = []
        for card in cards:
            if card is None:
                continue  # Skip None cards

            value = card["value"]
            suit = card["suit"]
            suit_symbol = {"c": "♣", "d": "♦", "h": "♥", "s": "♠"}.get(suit, suit)
            card_strs.append(f"{value}{suit_symbol}")

        return " ".join(card_strs)

    def generate_training_data(self):
        """
        Generate training data for Qwen from PHH files

        Returns:
            list: Training examples ready for Qwen
        """
        training_data = []

        for phh_data in tqdm(self.data, desc="Generating training examples"):
            # Generate examples from different player perspectives for more variety
            for player in phh_data.get("players", []):
                examples = self.convert_to_training_input(phh_data, player)
                for example in examples:
                    prompt = self.generate_prompt(example)

                    # Get the actual action taken as the target
                    action_taken = example["action_taken"]
                    if action_taken["type"] == "fold":
                        target = "After analyzing the situation, I decide to fold."
                    elif action_taken["type"] == "check_call":
                        target = "After analyzing the situation, I decide to call."
                    elif action_taken["type"] == "raise":
                        target = f"After analyzing the situation, I decide to raise to {action_taken['amount']}."

                    training_data.append(
                        {
                            "prompt": prompt,
                            "target": target,
                            "example": example,  # Keep the original example for reward calculation
                        }
                    )

        print(f"Generated {len(training_data)} total training examples")
        return training_data

    def save_training_data(self, output_file="phh_training_data.json"):
        """
        Save training data to a file

        Args:
            output_file: Path to save the training data
        """
        training_data = self.generate_training_data()

        with open(output_file, "w") as f:
            json.dump(training_data, f, indent=2)

        print(f"Saved {len(training_data)} training examples to {output_file}")
        return output_file


def main():
    parser = argparse.ArgumentParser(
        description="Preprocess PHH files for notebook use"
    )
    parser.add_argument(
        "--phh_path",
        type=str,
        default="/Users/maxforsey/Downloads/pluribus",
        help="Base path to pluribus PHH files",
    )
    parser.add_argument(
        "--folders",
        type=str,
        default="30,40,50,70,90",
        help="Comma-separated list of folders to process",
    )
    parser.add_argument(
        "--output_file",
        type=str,
        default="phh_training_data.json",
        help="Path to save the training data",
    )
    parser.add_argument(
        "--max_files",
        type=int,
        default=None,
        help="Max files to process per folder (for testing)",
    )

    args = parser.parse_args()

    print(f"Processing PHH files from {args.phh_path}")
    print(f"Folders: {args.folders}")

    # Process files
    folders = args.folders.split(",")
    processor = PHHPreprocessor(base_phh_path=args.phh_path, target_folders=folders)
    processor.load_phh_files(max_files_per_folder=args.max_files)
    processor.save_training_data(args.output_file)

    print(f"\nPreprocessing complete! Data saved to {args.output_file}")
    print(f"You can now load this data in your notebook with:")
    print(f"```python")
    print(f"import json")
    print(f"with open('{args.output_file}', 'r') as f:")
    print(f"    training_data = json.load(f)")
    print(f"```")


if __name__ == "__main__":
    main()
