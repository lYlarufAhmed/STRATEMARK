const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetBoardCatch = `    return res.json(boardData);
  } catch (error: any) {
    safeLog('Board generation failed:', error);
    const fallbackData = generateFallbackBoard(niche);
    return res.json(fallbackData);
  }`;
const newBoardCatch = `    return res.json(boardData);
  } catch (error: any) {
    console.error('Board generation failed:', error);
    return res.status(500).json({ error: cleanGeminiError(error) || 'Failed to generate board due to an API error.' });
  }`;
code = code.replace(targetBoardCatch, newBoardCatch);

const targetProfileCatch = `    return res.json(profileData);
  } catch (error: any) {
    safeLog('Company profile generation failed:', error);
    const fallbackData = generateFallbackCompanyProfile(companyName, niche);
    return res.json(fallbackData);
  }`;
const newProfileCatch = `    return res.json(profileData);
  } catch (error: any) {
    console.error('Company profile generation failed:', error);
    return res.status(500).json({ error: cleanGeminiError(error) || 'Failed to generate company profile due to an API error.' });
  }`;
code = code.replace(targetProfileCatch, newProfileCatch);

fs.writeFileSync('server.ts', code);
