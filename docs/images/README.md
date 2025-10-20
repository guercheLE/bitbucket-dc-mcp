# Visual Assets Directory

This directory contains screenshots and images used in the project README and documentation.

## Required Images

### 1. Setup Wizard Screenshot
**Filename:** `setup-wizard.png`  
**Description:** Screenshot showing the interactive setup wizard with:
- Bitbucket URL input prompt
- Authentication method selection
- Successful completion message
- Typical dimensions: 800x600px

### 2. Search Results Screenshot
**Filename:** `search-results.png`  
**Description:** Screenshot of semantic search CLI showing:
- Query input
- Ranked results with similarity scores
- Color-coded relevance indicators (green/yellow/red)
- Typical dimensions: 1000x400px

### 3. Claude Desktop Integration
**Filename:** `claude-desktop-integration.gif` or `claude-desktop-integration.png`  
**Description:** Screenshot or GIF showing:
- Claude Desktop with MCP server configured
- Example conversation using search_ids, get_id, call_id tools
- Bitbucket operation being executed successfully
- Typical dimensions: 1200x800px (screenshot) or 800x600px (GIF)

## Image Optimization Guidelines

- **Format:** PNG for screenshots, GIF for animations
- **Max width:** 1000px for optimal GitHub display
- **Compression:** Use ImageOptim, TinyPNG, or similar
- **Alt text:** Always include descriptive alt text for accessibility

## Adding Images to README

Once images are created, add them to README.md using:

```markdown
![Setup Wizard](docs/images/setup-wizard.png)
*Interactive setup wizard completes configuration in under 5 minutes*

![Semantic Search Results](docs/images/search-results.png)
*Semantic search returns ranked Bitbucket operations with relevance scores*

![Claude Desktop Integration](docs/images/claude-desktop-integration.png)
*Claude Desktop using MCP tools to interact with Bitbucket Data Center*
```

## Current Status

⚠️ **Placeholder directory created** - Images need to be captured and added

**Next steps:**
1. Run setup wizard and capture screenshot
2. Run semantic search CLI and capture results
3. Configure Claude Desktop and capture interaction
4. Optimize images and add to this directory
5. Update README.md with image references
