# BantayBot App

A React Native application built with Expo for security monitoring and alerting.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Expo Go app** on your mobile device (for testing on physical devices)
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd bantay-bot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Running the Application

### Start the development server:
```bash
npm start
```

This will start the Expo development server and display a QR code in the terminal.

### Running on different platforms:

#### On Mobile Device (Recommended)
1. Open the **Expo Go** app on your phone
2. Scan the QR code displayed in the terminal
3. The app will load and run on your device

#### On Android Emulator
```bash
npm run android
```
Or press `a` in the terminal after running `npm start`

#### On iOS Simulator (Mac only)
```bash
npm run ios
```
Or press `i` in the terminal after running `npm start`

#### On Web Browser
```bash
npm run web
```
Or press `w` in the terminal after running `npm start`

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

## Features

- Real-time security monitoring
- Alert notifications with sound
- History log of security events
- Live view capability
- Multi-language support (English and Tagalog)
- Action buttons for emergency response

## Troubleshooting

### Package Version Warnings
If you see warnings about package versions, you can update them:
```bash
npm update
```

### Metro Bundler Issues
If Metro bundler fails to start:
1. Clear the cache:
   ```bash
   npx expo start -c
   ```
2. Delete node_modules and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```

### Port Already in Use
If port 8081 is already in use:
```bash
npx expo start --port 8082
```

## Project Structure

```
bantay-bot/
├── App.js              # Main application entry point
├── components/         # Reusable components
├── screens/           # Application screens
├── assets/            # Images, sounds, and other assets
├── package.json       # Project dependencies
└── README.md         # Project documentation
```

## Dependencies

Key dependencies include:
- **expo** - Development platform
- **react-native** - Mobile framework
- **@react-navigation** - Navigation library
- **expo-av** - Audio/video functionality
- **@react-native-async-storage** - Local data storage

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary and confidential.

## Support

For issues or questions, please open an issue in the repository.