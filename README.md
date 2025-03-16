# TrustTag Chrome Extension

TrustTag is a Chrome extension that displays warnings on websites with questionable content. It helps users identify potentially misleading or problematic websites by showing warning banners with custom notes.

## Features

- Displays warning banners on websites that match entries in our central database
- Supports wildcard matching for URLs (e.g., `wikipedia.org/*Israel*`)
- Shows multiple warnings for the same website in a compact format
- Configurable sync interval for database updates
- Efficient caching using ETag for reduced bandwidth usage
- Simple and clean user interface

## Installation

Since this extension is not published to the Chrome Web Store, you'll need to install it in developer mode:

1. Download or clone this repository to your computer
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the directory containing the extension files
5. The TrustTag extension should now appear in your extensions list

## Setting Up Icons

Before loading the extension, you need to create the icon files:

1. Navigate to the `images` directory
2. Open the HTML files (`icon16.html`, `icon48.html`, `icon128.html`) in a browser
3. Take screenshots of each icon and save them as PNG files with the names `icon16.png`, `icon48.png`, and `icon128.png`

Alternatively, you can use the SVG code in `icon_reference.txt` to create the icons using an SVG editor or online converter.

## Configuration

1. Click on the TrustTag icon in your Chrome toolbar to open the settings popup
2. Select your preferred sync interval for database updates
3. Click "Save Settings"

## Warning Database

The extension connects to a central database that contains entries with the following information:

- `address`: The website URL or pattern to match (e.g., `example.com` or `wikipedia.org/*Israel*`)
- `short remark`: A brief warning message (e.g., "false information", "biased content")
- `Note text`: A more detailed explanation of the warning
- `Source`: A link to the source of the information or further reading

For more information about how the extension works, see the included `about.html` file.

## How It Works

1. When you open a webpage, TrustTag checks if the URL matches any entries in the warning database
2. If there's a match, it displays a warning banner at the top of the page
3. The banner shows the number of warnings and a list of short remarks
4. Clicking on a remark shows the full note text and source
5. You can close the banner using the × button

## Development

### File Structure

- `manifest.json`: Extension configuration
- `background.js`: Background script for data syncing
- `content.js`: Content script that runs on webpages
- `content.css`: Styles for the warning banner
- `popup.html`: Settings popup UI
- `popup.js`: JavaScript for the settings popup
- `images/`: Directory containing extension icons
- `test.html`: Test page for verifying extension functionality
- `about.html`: Information about the extension
- `package.bat`: Script for packaging the extension
- `GIT_WORKFLOW.md`: Guide for using Git with this project

### Customization

You can customize the appearance of the warning banner by modifying `content.css`.

### Packaging

To package the extension for distribution:

1. Make sure you've created the icon PNG files in the `images` directory
2. Run the `package.bat` script
3. The packaged extension will be created in the `dist` directory as `trusttag.zip`

## License

This project is open source and available under the MIT License.
