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

        // Check if API key exists
        const API_KEY = process.env.GOOGLE_API_KEY;
        if (!API_KEY) {
            console.error('GOOGLE_API_KEY not found in environment variables');
            return res.status(500).json({ error: 'API key not configured' });
        }

        console.log('Calling Google API...');
        
        // Call Google Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
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

        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response body:', responseText);
        
        if (!response.ok) {
            console.error('Google API Error:', responseText);
            return res.status(500).json({ 
                error: 'Google API request failed', 
                status: response.status,
                details: responseText 
            });
        }
        
        const data = JSON.parse(responseText);
        
        // Check if response has the expected structure
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Unexpected API response structure:', data);
            return res.status(500).json({ error: 'Unexpected API response', data });
        }
        
        const text = data.candidates[0].content.parts[0].text.trim();
        console.log('AI Response text:', text);
        
        const cleanText = text.replace(/```json|```/g, '').trim();
        const result = JSON.parse(cleanText);
        
        return res.status(200).json({ score: result.score });
    } catch (error) {
        console.error('Error details:', error.message);
        console.error('Full error:', error);
        return res.status(500).json({ 
            error: 'Analysis failed', 
            message: error.message 
        });
    }
}