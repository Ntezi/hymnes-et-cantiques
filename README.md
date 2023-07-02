# Hymnes et Cantiques App

This is a mobile application developed in React Native and Expo for viewing the songs from the "Hymnes et Cantiques" Kinyarwanda version. The app allows users to navigate through a list of songs and view song details.

## Features

1. **Song List Screen**: Displays a list of all the songs. Users can search songs by title or song number.
2. **Song Detail Screen**: Displays the details of a selected song. The song number, title, subtitle, and verses are shown. Users can swipe left or right to navigate to the previous or next song.

## Data

The songs are stored in a JSON file, `songs.json`, in the following format:

```json
[
    {
        "song_number": 1,
        "title": "TURAGUSINGIZA DATA",
        "sub_title": "N'icyubahiro",
        "verses": [
            "\n1. Turagusingiza Data,...",
            "2. Watuviriye nk'umucyo,..."
        ]
    },
    ...
]
```

## Screenshots

[Add screenshots of your app here]

## Setup and Installation

To set up the application on your local machine, follow these steps:

1. Clone the repository to your machine.
2. Run `npm install` to install all the dependencies.
3. Install the Expo CLI if you haven't already, by running `npm install -g expo-cli`.
4. Run `expo start` to start the Expo packager.
5. Open the app on your phone using the Expo client app.
