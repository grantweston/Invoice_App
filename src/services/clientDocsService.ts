export const clientDocsService = {
  async getDocument(documentId: string) {
    console.log('Fetching document:', documentId);
    try {
      const response = await fetch(`/api/docs/${documentId}`);
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to get document: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Document data size:', JSON.stringify(data).length);
      return data;
    } catch (error) {
      console.error('Error in getDocument:', error);
      throw error;
    }
  },

  async updateDocument(documentId: string, updates: any[]) {
    console.log('Updating document:', documentId, 'with updates:', updates);
    try {
      const response = await fetch(`/api/docs/${documentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to update document: ${response.status} ${errorText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Error in updateDocument:', error);
      throw error;
    }
  },

  async extractAmount(doc: any): Promise<number | null> {
    try {
      console.log('🔍 Extracting amount from document...');
      const response = await fetch('/api/docs/extract-amount', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ doc }),
      });

      if (!response.ok) {
        throw new Error(`Failed to extract amount: ${response.status}`);
      }

      const { amount } = await response.json();
      console.log('💵 Extracted amount:', amount);
      return amount;
    } catch (error) {
      console.error('❌ Error extracting amount:', error);
      return null;
    }
  }
}; 