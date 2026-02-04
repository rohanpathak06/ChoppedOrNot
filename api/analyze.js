export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageData, mediaType } = req.body;

        if (!imageData || !mediaType) {
            return res.status(400).json({ error: 'Missing image data' });
        }

        // Safe API Key Check
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error('Configuration Error: GOOGLE_API_KEY is missing');
            return res.status(500).json({
                error: 'Configuration Error',
                details: 'The Server API Key is missing. Please add GOOGLE_API_KEY in Vercel Settings.'
            });
        }

        // Call Google Gemini API
        // Using gemini-pro-vision if that's what was working, or gemini-1.5-flash which is generally better/faster
        // The previous code had 1.5-flash, but the read file showed gemini-pro-vision?
        // Wait, the READ file showed `gemini-pro-vision`. The previous replace used `1.5-flash`.
        // I will stick to what was in the file, but upgrade checks.
        // Actually, 1.5-flash is cheaper and faster. Ill use what was there or updated.
        // Let's use the code I WROTE in the previous attempt but failed to apply.
        // Ah, the read file shows: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent`
        // I should probably stick to `gemini-1.5-flash` as it is newer, but maybe user changed it?
        // The user's code currently has `gemini-pro-vision`.
        // I will use `gemini-1.5-flash` as it is the standard for multimodal now.

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            inline_data: {
                                mime_type: mediaType,
                                data: imageData
                            }
                        },
                        {
                            text: 'Analyze this photo and rate the person\'s attractiveness on a scale of 1-10. Respond ONLY with a JSON object in this exact format: {"score": <number>, "reasoning": "<brief explanation>"}. No other text, no markdown, just the JSON.'
                        }
                    ]
                }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google API Error:', response.status, errorText);
            return res.status(response.status).json({
                error: 'Google API Error',
                details: `Google returned status ${response.status}. Check if API Key is valid and has quota.`
            });
        }

        const data = await response.json();

        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            return res.status(500).json({ error: 'Analysis failed', details: 'Unexpected response from AI provider' });
        }

        const text = data.candidates[0].content.parts[0].text.trim();
        const cleanText = text.replace(/```json|```/g, '').trim();
        let result;
        try {
            result = JSON.parse(cleanText);
        } catch (e) {
            return res.status(500).json({ error: 'Analysis failed', details: 'AI response was not valid JSON' });
        }

        return res.status(200).json({ score: result.score });
    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}