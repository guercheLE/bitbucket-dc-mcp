# Authentication Screenshots

This directory contains screenshots for the authentication setup guide documentation.

## Screenshot Requirements

**Technical Specifications:**
- **Format:** PNG (preferred) or JPEG
- **Resolution:** Minimum 1920x1080 (retina/HiDPI preferred)
- **File Size:** Optimize to < 500KB per image (use compression tools)
- **Naming Convention:** `{auth-method}-{sequence}-{description}.png`

**Visual Guidelines:**
- **Annotations:** Use arrows, boxes, or highlights to indicate key UI elements
- **Privacy:** Blur or redact sensitive information (usernames, tokens, company names)
- **Clarity:** Ensure text is readable at documentation display size
- **Consistency:** Use same Bitbucket theme/version across all screenshots
- **Captions:** Include descriptive alt text for accessibility

## Screenshot Inventory

### OAuth 2.0 Screenshots (7 needed)

- [ ] `oauth2-01-admin-menu.png` - Bitbucket admin gear menu with "Manage apps" highlighted
- [ ] `oauth2-02-application-links.png` - Application Links page in Bitbucket admin
- [ ] `oauth2-03-create-link.png` - Create new application link dialog
- [ ] `oauth2-04-app-config.png` - OAuth 2.0 application configuration form
- [ ] `oauth2-05-credentials.png` - Client ID and Client Secret display (redact actual values)
- [ ] `oauth2-06-authorize-page.png` - Bitbucket OAuth authorization page (user perspective)
- [ ] `oauth2-07-auth-success.png` - Authorization success message

**Notes:**
- Screenshot 05: Redact actual client_id and client_secret values
- Show "Show secret" button click action
- Include Bitbucket version indicator in screenshots (e.g., footer)

### Personal Access Token Screenshots (6 needed)

- [ ] `pat-01-profile-menu.png` - Bitbucket profile menu dropdown
- [ ] `pat-02-tokens-page.png` - Personal Access Tokens management page
- [ ] `pat-03-create-dialog.png` - Create token button/dialog
- [ ] `pat-04-token-config.png` - Token configuration form (name, expiration)
- [ ] `pat-05-token-display.png` - Token displayed after creation (redact token value)
- [ ] `pat-06-token-list.png` - Token list showing created tokens

**Notes:**
- Screenshot 05: Redact actual token value (show format but not real token)
- Highlight "shown only once" warning
- Show expiration date configuration options

### OAuth 1.0a Screenshots (8 needed)

- [ ] `oauth1-01-admin-menu.png` - Bitbucket admin gear menu (similar to OAuth 2.0)
- [ ] `oauth1-02-application-links.png` - Application Links page
- [ ] `oauth1-03-create-link.png` - Create application link (OAuth 1.0a flow)
- [ ] `oauth1-04-app-config.png` - Application details configuration (consumer key, etc.)
- [ ] `oauth1-05-incoming-auth.png` - Incoming authentication configuration (public key)
- [ ] `oauth1-06-link-created.png` - Successfully created application link
- [ ] `oauth1-07-authorize-page.png` - OAuth 1.0a user authorization page
- [ ] `oauth1-08-auth-success.png` - Authorization success

**Notes:**
- Screenshot 05: Show public key paste field (use example key, not real production key)
- Highlight consumer key field
- Show "Allow 2-Legged OAuth" checkbox if present

## Screenshot Workflow

### Capture Process

1. **Preparation:**
   - Use clean Bitbucket instance (demo data, no sensitive info)
   - Set browser to 100% zoom (no scaling)
   - Use consistent Bitbucket theme (default light theme recommended)
   - Clear browser console and notifications

2. **Capture:**
   - Use native screenshot tool or browser extension
   - Capture full relevant area (not just portion)
   - Include context (breadcrumbs, navigation) where helpful

3. **Annotation:**
   - Use annotation tool (Skitch, Markup, etc.)
   - Add arrows or boxes to highlight key elements
   - Use consistent color scheme (red for important, blue for informational)
   - Number steps if multiple actions in one screenshot

4. **Optimization:**
   ```bash
   # Optimize PNG files (install pngquant)
   pngquant --quality=65-80 --output optimized.png original.png
   
   # Or use ImageOptim (macOS)
   # Or use online tools: TinyPNG, ImageOptim
   ```

5. **Review:**
   - Verify no sensitive data visible
   - Check readability at documentation display size
   - Ensure filename matches naming convention

### Adding Screenshots to Documentation

After capturing screenshots, update `docs/authentication.md` to replace placeholder comments with actual image references:

```markdown
<!-- Screenshot: Bitbucket admin menu navigation -->
![Bitbucket Admin Menu](./images/auth/oauth2-01-admin-menu.png)
```

Becomes:

```markdown
![Bitbucket Admin Menu](./images/auth/oauth2-01-admin-menu.png)
*Figure 1: Navigate to Bitbucket Administration → Manage apps*
```

## Alt Text Guidelines

Provide descriptive alt text for accessibility:

**Good:**
```markdown
![Bitbucket Application Links page showing list of configured applications with "Create link" button highlighted](./images/auth/oauth2-02-application-links.png)
```

**Bad:**
```markdown
![Screenshot](./images/auth/oauth2-02-application-links.png)
```

## Version Considerations

**Bitbucket Version Differences:**
- Different Bitbucket versions may have slightly different UI
- Use Bitbucket 8.20+ for OAuth 2.0 screenshots (most common)
- Use Bitbucket 8.14+ for PAT screenshots
- Note version in caption if UI differs significantly

**Handling Version Variations:**
- Take screenshots from most recent stable version
- Add note in caption: "Note: UI may differ slightly in Bitbucket versions < 8.20"
- Provide text description for version-agnostic guidance

## Placeholder Status

**Current Status:** All screenshots are placeholders (HTML comments in documentation)

**Next Steps:**
1. Set up demo Bitbucket instance or use test environment
2. Follow setup guides to capture authentic screenshots
3. Annotate and optimize images
4. Replace placeholder comments with actual screenshots
5. Review for quality and completeness

## Tools Recommended

**Screenshot Capture:**
- macOS: Screenshot tool (Cmd+Shift+4), CleanShot X
- Windows: Snipping Tool, Greenshot
- Linux: Flameshot, GNOME Screenshot
- Browser: Awesome Screenshot (Chrome/Firefox extension)

**Annotation:**
- macOS: Preview Markup, Skitch
- Windows: Paint, Greenshot Editor
- Cross-platform: GIMP, Photopea (web-based)

**Optimization:**
- CLI: pngquant, ImageMagick
- GUI: ImageOptim (macOS), RIOT (Windows)
- Web: TinyPNG, Squoosh

## Review Checklist

Before committing screenshots, verify:

- [ ] Correct filename convention
- [ ] File size < 500KB
- [ ] No sensitive data visible (tokens, real usernames, company info)
- [ ] Readable at documentation display size
- [ ] Annotations clear and helpful
- [ ] Alt text descriptive
- [ ] Referenced correctly in documentation
- [ ] Consistent visual style across all screenshots
