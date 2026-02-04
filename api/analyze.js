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

    // Debug logging
    console.log('Request received');
    console.log('API Key present:', !!process.env.GOOGLE_API_KEY);

    try {
        // Parse body if it's a string
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { imageData, mediaType } = body;

        if (!imageData || !mediaType) {
            console.error('Missing data:', { hasImage: !!imageData, hasType: !!mediaType });
            return res.status(400).json({ error: 'Missing image data' });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error('GOOGLE_API_KEY is missing in environment variables');
            return res.status(500).json({ error: 'Server configuration error: API Key missing' });
        }

        // Call Google Gemini API
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
            console.error('Google API error:', response.status, errorText);
            throw new Error(`Google API request failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text.trim();
        const cleanText = text.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanText);

        return res.status(200).json({ score: result.score });
    } catch (error) {
        console.error('Full Error Object:', error);
        return res.status(500).json({ error: error.message || 'Analysis failed', details: error.toString() });
    }
}