#!/usr/bin/env node

// Test semplice per verificare se il problema è con il nostro codice
console.log('Starting simple test...');

const { spawn } = require('child_process');

// Test 1: Comando semplice
console.log('Test 1: Simple echo command');
const child1 = spawn('echo', ['Hello World'], { stdio: 'inherit' });
child1.on('close', (code) => {
    console.log(`Echo command exited with code ${code}`);
    
    // Test 2: Comando con output
    console.log('Test 2: ls command');
    const child2 = spawn('ls', ['-la'], { stdio: 'inherit' });
    child2.on('close', (code) => {
        console.log(`ls command exited with code ${code}`);
        
        // Test 3: Comando interattivo
        console.log('Test 3: btop command');
        const child3 = spawn('timeout', ['3', 'btop'], { stdio: 'inherit' });
        child3.on('close', (code) => {
            console.log(`btop command exited with code ${code}`);
            console.log('All tests completed!');
        });
    });
});
