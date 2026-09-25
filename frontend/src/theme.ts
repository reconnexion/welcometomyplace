import type { ThemeConfig } from 'antd';

/**
 * Antd theme tokens replicating the current brand identity (see the old
 * `frontend/src/config/theme.js` MUI theme): warm orange primary, `Open Sans` body copy
 * (headings get `Chewy` via a scoped CSS rule in `index.css`, since Antd has no separate
 * "heading font" token), and generously-rounded, pill-leaning buttons.
 */
const theme: ThemeConfig = {
  token: {
    colorPrimary: '#FFA500',
    // Deliberately not overridden: the only "info"-typed elements in this app are plain
    // Alert banners (draft-mode/join-right/share-right notices, location notes), which are meant
    // to look like the old app's light-blue MUI info alerts, not brand orange.
    colorLink: '#FFA500',
    fontFamily: '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    borderRadius: 8
  },
  components: {
    // One size for every button in the app (MUI "contained" look of the old app, a bit slimmer).
    Button: {
      controlHeight: 34,
      paddingInline: 16,
      fontWeight: 400,
      primaryShadow:
        '0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 1px 5px 0 rgba(0, 0, 0, 0.12)'
    },
    // Old MUI cards/alerts had a 4px radius (buttons kept 8px).
    Card: {
      borderRadiusLG: 4
    },
    Alert: {
      borderRadiusLG: 4
    },
    Layout: {
      headerBg: 'transparent',
      bodyBg: '#eaeaea'
    }
  }
};

export default theme;
