// Test timeout function
function withTimeout(promise, ms, errorMessage = 'Operation timed out') {
  let timeoutId;
  
  const wrappedPromise = new Promise((resolve, reject) => {
    // Set up the timeout
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
    
    // Handle the original promise
    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
  
  return wrappedPromise;
}

// Test with a promise that resolves after 2 seconds
async function testTimeout() {
  console.log('Testing timeout function...');
  
  try {
    // This should succeed
    const result1 = await withTimeout(
      new Promise(resolve => setTimeout(() => resolve('Success!'), 2000)),
      5000,
      'Test timed out'
    );
    console.log('✅ Test 1 passed:', result1);
    
    // This should timeout
    try {
      const result2 = await withTimeout(
        new Promise(resolve => setTimeout(() => resolve('Too slow'), 5000)),
        2000,
        'Test timed out'
      );
      console.log('❌ Test 2 should have timed out but got:', result2);
    } catch (error) {
      console.log('✅ Test 2 passed (correctly timed out):', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTimeout();
