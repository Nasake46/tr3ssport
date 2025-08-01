console.log('🔍 TEST SERVICE - Module chargé');

export const simpleTestFunction = async (): Promise<void> => {
  console.log('🧪 SIMPLE TEST - Fonction appelée avec succès');
};

export const anotherFunction = () => {
  console.log('🧪 ANOTHER - Fonction appelée');
};

console.log('🔍 TEST SERVICE - Exports définis');
console.log('🔍 TEST SERVICE - simpleTestFunction type:', typeof simpleTestFunction);
console.log('🔍 TEST SERVICE - anotherFunction type:', typeof anotherFunction);
