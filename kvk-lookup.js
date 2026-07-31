export default async function handler(req, res) {
  // POST: { kvk_number: "12345678" }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { kvk_number } = req.body;

  if (!kvk_number || kvk_number.length !== 8) {
    return res.status(400).json({ error: 'Invalid KvK number (must be 8 digits)' });
  }

  try {
    // Use open KvK data from overheid.nl (free, no auth needed)
    // Falls back to web scraping if needed
    
    const response = await fetch(
      `https://openkvk.nl/api/v1/companies?trade_name=${kvk_number}`,
      {
        headers: { 'User-Agent': 'Oibase/1.0' }
      }
    );

    if (!response.ok) {
      return res.status(404).json({ 
        error: 'KvK not found',
        kvk: kvk_number 
      });
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ 
        error: 'No company found for this KvK',
        kvk: kvk_number
      });
    }

    const company = data.results[0];

    // Extract relevant fields
    const extracted = {
      kvk_number: company.kvk || kvk_number,
      company_name: company.company_name || company.name,
      street: company.street || company.address,
      city: company.city,
      postal_code: company.postal_code,
      country: company.country || 'NL',
      legal_form: company.legal_form || 'Onbekend',
      branch: company.branch || company.sbi_description,
      employees: company.number_of_employees || null,
      establishment_date: company.establishment_date || null
    };

    return res.status(200).json({
      success: true,
      data: extracted
    });

  } catch (error) {
    console.error('KvK lookup error:', error);
    
    // Fallback: return empty but valid response
    return res.status(500).json({
      error: 'Failed to lookup KvK',
      message: error.message
    });
  }
}

export const config = {
  maxDuration: 15
};
