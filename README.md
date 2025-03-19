# TrustTag Chrome Extension

TrustTag is a Chrome extension that displays warnings on websites with questionable content. It helps users identify potentially misleading or problematic websites by showing warning banners with custom notes.

## Features

- Displays warning banners on websites that match entries in configured data sources
- Support for multiple data sources that can be added, removed, or toggled
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

## Configuration

1. Click on the TrustTag icon in your Chrome toolbar to open the settings popup
2. Manage your data sources:
   - By default, the extension uses our central database
   - You can add additional data sources by entering their URLs
   - Each data source can be enabled or disabled individually
   - You can remove data sources you no longer want to use
3. Select your preferred sync interval for database updates
4. Click "Save Settings"

## Data Sources

The extension supports multiple data sources for warnings:

- By default, it uses our central database at `https://trusttag.kuilef42.workers.dev/`
- You can add additional data sources that provide compatible JSON data
- Each data source should return entries with the following information:
  - `address`: The website URL or pattern to match (e.g., `example.com` or `wikipedia.org/*Israel*`)
  - `short remark`: A brief warning message (e.g., "false information", "biased content")
  - `Note text`: A more detailed explanation of the warning
  - `Source`: A link to the source of the information or further reading

For more information about how the extension works, see the included `about.html` file.

## How It Works

1. When you open a webpage, TrustTag checks if the URL matches any entries in your configured data sources
2. If there's a match, it displays a warning banner at the top of the page
3. The banner shows the number of warnings and a list of short remarks with their sources
4. Clicking on a remark shows the full note text, source, and data source information
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

### Customization

You can customize the appearance of the warning banner by modifying `content.css`.

## License

This project is open source and available under the MIT License.
