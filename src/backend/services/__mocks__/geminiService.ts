export class GeminiService {
  async compareNames(name1: string, name2: string) {
    return {
      areSimilar: name1 === name2,
      confidence: name1 === name2 ? 0.9 : 0.2
    };
  }
} 