#!/usr/bin/env python3
"""
Script to load poker data files from a directory and create a dataset
compatible with the reward functions in the notebook.

This script handles PHH format poker data files and processes them into
a format that can be used with the GRPO training pipeline.
"""

import os
import re
import glob
import json
import argparse
from pathlib import Path
from tqdm import tqdm


class PokerDatasetLoader:
    def __init__(self, data_directory):
        """
        Initialize the poker dataset loader

        Args:
            data_directory: Directory containing poker data files
        """
        self.data_directory = Path(data_directory)
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

    def load_all_files(self, max_files=None):
        """
        Load all poker data files from the data directory and its subdirectories

        Args:
            max_files: Optional limit on total files to process (for testing)

        Returns:
            list: Parsed poker data
        """
        all_files = []

        # Find all files in the directory and subdirectories
        for root, _, files in os.walk(self.data_directory):
            for file in files:
                file_path = Path(root) / file
                all_files.append(file_path)

        # Limit the number of files if specified
        if max_files:
            all_files = all_files[:max_files]

        print(f"Found {len(all_files)} poker data files")

        # Process each file
        for file_path in tqdm(all_files, desc="Processing poker files"):
            try:
                poker_data = self.parse_file(file_path)
                if poker_data:
                    self.data.append(poker_data)
            except Exception as e:
                print(f"Error processing {file_path}: {e}")

        print(f"Successfully processed {len(self.data)} poker data files")
        return self.data

    def parse_file(self, file_path):
        """
        Parse a single poker data file

        Args:
            file_path: Path to the poker data file

        Returns:
            dict: Parsed poker data
        """
        with open(file_path, "r") as f:
            content = f.read()

        # Create a dictionary to store all the data
        data = {}
        data["file_path"] = str(file_path)

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
        Parse poker actions from the data file

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
            elif len(parts) >= 2 and parts[1] == "f":
                # Fold action
                player = parts[0]
                parsed_actions.append({"type": "fold", "player": player})
            elif len(parts) >= 2 and parts[1] == "cc":
                # Check/call action
                player = parts[0]
                parsed_actions.append({"type": "check_call", "player": player})
            elif len(parts) >= 3 and parts[1] == "cbr":
                # Raise action
                player = parts[0]
                amount = int(parts[2])
                parsed_actions.append(
                    {"type": "raise", "player": player, "amount": amount}
                )
            elif len(parts) >= 2 and parts[1] == "sm":
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

        value = card_str[0].upper()
        suit = card_str[1].lower()

        return {
            "value": value,
            "suit": suit,
            "value_int": self.card_values.get(value, 0),
            "suit_name": self.card_suits.get(suit, ""),
        }

    def extract_player_hands(self):
        """
        Extract player hands from the parsed data

        Returns:
            list: List of player hand examples
        """
        player_hands = []

        for hand_data in self.data:
            # Get player names
            players = hand_data.get("players", [])

            # Extract hole cards for each player
            player_hole_cards = {}
            community_cards = []

            for action in hand_data.get("parsed_actions", []):
                if action["type"] == "deal_hole_cards":
                    player_idx = action["player"].replace("p", "")
                    if player_idx.isdigit():
                        player_idx = int(player_idx) - 1  # Convert to 0-indexed
                        if 0 <= player_idx < len(players):
                            player_name = players[player_idx]
                            player_hole_cards[player_name] = action["cards"]

                elif action["type"] == "deal_board":
                    community_cards.extend(action["cards"])

            # Extract player actions
            player_actions = []
            for action in hand_data.get("parsed_actions", []):
                if action["type"] in ["fold", "check_call", "raise"]:
                    player_idx = action["player"].replace("p", "")
                    if player_idx.isdigit():
                        player_idx = int(player_idx) - 1
                        if 0 <= player_idx < len(players):
                            player_name = players[player_idx]
                            player_actions.append(
                                {
                                    "player": player_name,
                                    "action": action["type"],
                                    "amount": action.get("amount", 0),
                                }
                            )

            # Create examples for each player
            for player_name, hole_cards in player_hole_cards.items():
                # Find actions by this player
                actions = [a for a in player_actions if a["player"] == player_name]

                # Skip if player didn't take any actions
                if not actions:
                    continue

                # Create example for each action
                for i, action in enumerate(actions):
                    # Determine the state of the board at this action
                    current_community_cards = []
                    if i == 0:  # First action might be pre-flop
                        pass  # Empty community cards
                    elif i == 1 and len(community_cards) >= 3:  # Might be on the flop
                        current_community_cards = community_cards[:3]
                    elif i == 2 and len(community_cards) >= 4:  # Might be on the turn
                        current_community_cards = community_cards[:4]
                    elif i == 3 and len(community_cards) >= 5:  # Might be on the river
                        current_community_cards = community_cards[:5]

                    # Create the example
                    example = {
                        "hand_id": hand_data.get("hand", 0),
                        "player_name": player_name,
                        "hole_cards": hole_cards,
                        "community_cards": current_community_cards,
                        "action_taken": action["action"],
                        "bet_amount": action.get("amount", 0),
                        "pot_size": hand_data.get("pot_size", 0),
                        "blinds": hand_data.get("blinds_or_straddles", [0, 0]),
                        "antes": hand_data.get("antes", [0, 0, 0, 0, 0, 0]),
                        "starting_stacks": hand_data.get("starting_stacks", []),
                        "finishing_stacks": hand_data.get("finishing_stacks", []),
                        "players": players,
                        "variant": hand_data.get("variant", "NT"),
                    }

                    player_hands.append(example)

        return player_hands

    def calculate_simplified_equity(self, hole_cards, community_cards):
        """
        Calculate a simplified equity score for a hand

        Args:
            hole_cards: List of hole cards
            community_cards: List of community cards

        Returns:
            float: Simplified equity score (0-1)
        """
        # Pre-flop equity calculation
        if not community_cards:
            card1, card2 = hole_cards
            is_pair = card1["value"] == card2["value"]
            is_suited = card1["suit"] == card2["suit"]
            high_card = max(card1["value_int"], card2["value_int"])
            low_card = min(card1["value_int"], card2["value_int"])
            gap_size = high_card - low_card - 1

            # Premium pairs
            if is_pair and card1["value_int"] >= 10:
                return 0.85 + (card1["value_int"] - 10) / 40
            # Medium pairs
            if is_pair and card1["value_int"] >= 7:
                return 0.7
            # Small pairs
            if is_pair:
                return 0.6

            # High cards suited
            if is_suited and high_card >= 12:
                return 0.75
            if is_suited and high_card >= 10 and gap_size <= 2:
                return 0.65

            # High cards unsuited
            if high_card >= 13 and low_card >= 10:
                return 0.7
            if high_card >= 12 and low_card >= 10:
                return 0.6

            # Connected high cards
            if gap_size <= 1 and low_card >= 9:
                return 0.6

            # Mid-range hands
            if (is_suited and gap_size <= 2) or (gap_size <= 1 and low_card >= 7):
                return 0.5

            # Weak hands
            return 0.3 + high_card / 40

        # Post-flop: simplified calculation
        # In a real implementation, this would use a proper hand evaluator
        # For now, we'll use a simplified approach
        return 0.3 + 0.4 * (len(community_cards) / 5)

    def prepare_for_reward_functions(self):
        """
        Prepare the dataset for use with reward functions

        Returns:
            list: Dataset ready for reward functions
        """
        player_hands = self.extract_player_hands()
        reward_ready_dataset = []

        for example in player_hands:
            # Calculate equity for reward functions
            equity = self.calculate_simplified_equity(
                example["hole_cards"], example["community_cards"]
            )

            # Prepare data in format expected by reward functions
            reward_data = {
                "your_hand": example["hole_cards"],
                "community_cards": example["community_cards"],
                "equity": equity,
                "pot_size": example["pot_size"],
                "amount_to_call": 0,  # Would need to be calculated from game state
                "your_position": 0,  # Would need to be determined from player position
                "your_chips": example["starting_stacks"][
                    example["players"].index(example["player_name"])
                ]
                if example["player_name"] in example["players"]
                else 0,
                "opponent_chips": max(example["starting_stacks"])
                if example["starting_stacks"]
                else 10000,
                "action": example["action_taken"],
                "emotions_other_players": {},  # Not available in this dataset
                "action_previous_players": [],  # Would need to be extracted from game history
                "hand_id": example["hand_id"],
                "player_name": example["player_name"],
                "bet_amount": example["bet_amount"],
            }

            reward_ready_dataset.append(reward_data)

        return reward_ready_dataset

    def save_dataset(self, output_file="poker_dataset.json"):
        """
        Save the prepared dataset to a file

        Args:
            output_file: Path to save the dataset

        Returns:
            str: Path to the saved file
        """
        dataset = self.prepare_for_reward_functions()

        with open(output_file, "w") as f:
            json.dump(dataset, f, indent=2)

        print(f"Saved {len(dataset)} examples to {output_file}")
        return output_file


def main():
    parser = argparse.ArgumentParser(
        description="Load poker data files and create a dataset for reward functions"
    )
    parser.add_argument(
        "--data_dir",
        type=str,
        required=True,
        help="Directory containing poker data files",
    )
    parser.add_argument(
        "--output_file",
        type=str,
        default="poker_dataset.json",
        help="Output file to save the dataset",
    )
    parser.add_argument(
        "--max_files",
        type=int,
        default=None,
        help="Maximum number of files to process (for testing)",
    )

    args = parser.parse_args()

    loader = PokerDatasetLoader(args.data_dir)
    loader.load_all_files(max_files=args.max_files)
    loader.save_dataset(args.output_file)


if __name__ == "__main__":
    main()
