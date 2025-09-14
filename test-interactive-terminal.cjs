#!/usr/bin/env node

/**
 * Test per il terminale interattivo con supporto PTY
 * 
 * Questo script testa i comandi interattivi come btop++, htop, nano, vim
 * per verificare che il supporto TTY funzioni correttamente.
 */

const { spawn } = require('child_process');
const readline = require('readline');

class InteractiveTerminalTester {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
    }

    /**
     * Esegue un test per un comando interattivo
     */
    async testInteractiveCommand(command, testName, timeout = 10000) {
        console.log(`\n🧪 Testing: ${testName}`);
        console.log(`📝 Command: ${command}`);
        console.log('─'.repeat(50));

        return new Promise((resolve) => {
            const startTime = Date.now();
            let hasExited = false;
            let output = '';
            let errorOutput = '';

            // Usa spawn per comandi interattivi con PTY
            const child = spawn('sh', ['-c', command], {
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    TERM: 'xterm-256color',
                    COLORTERM: 'truecolor',
                    FORCE_COLOR: '1',
                    TERM_PROGRAM: 'TermInA'
                }
            });

            // Gestisci stdout
            child.stdout.on('data', (data) => {
                const dataStr = data.toString();
                output += dataStr;
                process.stdout.write(dataStr);
            });

            // Gestisci stderr
            child.stderr.on('data', (data) => {
                const dataStr = data.toString();
                errorOutput += dataStr;
                process.stderr.write(dataStr);
            });

            // Gestisci chiusura
            child.on('close', (code) => {
                if (hasExited) return;
                hasExited = true;

                const duration = Date.now() - startTime;
                const success = code === 0;
                
                const result = {
                    testName,
                    command,
                    success,
                    exitCode: code,
                    duration,
                    output: output.substring(0, 500), // Limita l'output per il log
                    errorOutput: errorOutput.substring(0, 500),
                    hasTTY: output.includes('\x1b[') || errorOutput.includes('\x1b['), // Controlla sequenze ANSI
                    isInteractive: this.isInteractiveCommand(command)
                };

                this.testResults.push(result);
                
                console.log(`\n✅ Test completed: ${success ? 'PASSED' : 'FAILED'}`);
                console.log(`⏱️  Duration: ${duration}ms`);
                console.log(`🔢 Exit code: ${code}`);
                console.log(`🎨 Has ANSI colors: ${result.hasTTY ? 'YES' : 'NO'}`);
                
                resolve(result);
            });

            // Gestisci errori
            child.on('error', (error) => {
                if (hasExited) return;
                hasExited = true;

                const duration = Date.now() - startTime;
                const result = {
                    testName,
                    command,
                    success: false,
                    exitCode: 1,
                    duration,
                    output: '',
                    errorOutput: error.message,
                    hasTTY: false,
                    isInteractive: this.isInteractiveCommand(command)
                };

                this.testResults.push(result);
                
                console.log(`\n❌ Test failed with error: ${error.message}`);
                resolve(result);
            });

            // Timeout
            setTimeout(() => {
                if (!hasExited) {
                    console.log(`\n⏰ Test timeout after ${timeout}ms, killing process`);
                    child.kill('SIGTERM');
                }
            }, timeout);
        });
    }

    /**
     * Determina se un comando è interattivo
     */
    isInteractiveCommand(command) {
        const interactiveCommands = [
            'btop', 'btop++', 'htop', 'top', 'nano', 'vim', 'vi', 'emacs',
            'less', 'more', 'man', 'ssh', 'telnet', 'nc', 'netcat',
            'mysql', 'psql', 'sqlite3', 'python', 'node', 'irb', 'pry',
            'gdb', 'lldb', 'strace', 'ltrace', 'tcpdump', 'wireshark'
        ];
        
        const cmd = command.split(' ')[0].toLowerCase();
        return interactiveCommands.some(interactive => 
            cmd.includes(interactive) || interactive.includes(cmd)
        );
    }

    /**
     * Esegue tutti i test
     */
    async runAllTests() {
        console.log('🚀 Starting Interactive Terminal Tests');
        console.log('═'.repeat(60));

        const tests = [
            {
                command: 'echo "Testing basic command"',
                name: 'Basic Command Test',
                timeout: 5000
            },
            {
                command: 'ls --color=always',
                name: 'Colored Output Test',
                timeout: 5000
            },
            {
                command: 'which btop++ && echo "btop++ found" || echo "btop++ not found"',
                name: 'btop++ Availability Test',
                timeout: 5000
            },
            {
                command: 'which htop && echo "htop found" || echo "htop not found"',
                name: 'htop Availability Test',
                timeout: 5000
            },
            {
                command: 'which nano && echo "nano found" || echo "nano not found"',
                name: 'nano Availability Test',
                timeout: 5000
            },
            {
                command: 'which vim && echo "vim found" || echo "vim not found"',
                name: 'vim Availability Test',
                timeout: 5000
            }
        ];

        // Aggiungi test per comandi interattivi se disponibili
        if (this.isCommandAvailable('btop++')) {
            tests.push({
                command: 'timeout 3 btop++ || true',
                name: 'btop++ Interactive Test',
                timeout: 5000
            });
        }

        if (this.isCommandAvailable('htop')) {
            tests.push({
                command: 'timeout 3 htop || true',
                name: 'htop Interactive Test',
                timeout: 5000
            });
        }

        for (const test of tests) {
            await this.testInteractiveCommand(test.command, test.name, test.timeout);
            await this.sleep(1000); // Pausa tra i test
        }

        this.printSummary();
    }

    /**
     * Controlla se un comando è disponibile
     */
    isCommandAvailable(command) {
        try {
            require('child_process').execSync(`which ${command}`, { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Pausa per un certo numero di millisecondi
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Stampa il riassunto dei test
     */
    printSummary() {
        console.log('\n' + '═'.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('═'.repeat(60));

        const total = this.testResults.length;
        const passed = this.testResults.filter(r => r.success).length;
        const failed = total - passed;
        const interactiveTests = this.testResults.filter(r => r.isInteractive);
        const ttyTests = this.testResults.filter(r => r.hasTTY);

        console.log(`📈 Total tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`🎮 Interactive tests: ${interactiveTests.length}`);
        console.log(`🎨 TTY/ANSI tests: ${ttyTests.length}`);

        console.log('\n📋 Detailed Results:');
        console.log('─'.repeat(60));

        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            const tty = result.hasTTY ? '🎨' : '📝';
            const interactive = result.isInteractive ? '🎮' : '⚙️';
            
            console.log(`${index + 1}. ${status} ${tty} ${interactive} ${result.testName}`);
            console.log(`   Command: ${result.command}`);
            console.log(`   Exit code: ${result.exitCode}, Duration: ${result.duration}ms`);
            
            if (!result.success && result.errorOutput) {
                console.log(`   Error: ${result.errorOutput.substring(0, 100)}...`);
            }
            console.log('');
        });

        // Raccomandazioni
        console.log('💡 Recommendations:');
        console.log('─'.repeat(60));
        
        if (interactiveTests.length === 0) {
            console.log('⚠️  No interactive commands were tested. Install btop++, htop, nano, or vim for full testing.');
        }
        
        if (ttyTests.length === 0) {
            console.log('⚠️  No TTY/ANSI color support detected. Check TERM environment variable.');
        }
        
        if (failed > 0) {
            console.log('⚠️  Some tests failed. Check the error messages above.');
        }
        
        if (passed === total && ttyTests.length > 0) {
            console.log('🎉 All tests passed! Terminal TTY support is working correctly.');
        }
    }
}

// Esegui i test se questo script viene chiamato direttamente
if (require.main === module) {
    const tester = new InteractiveTerminalTester();
    tester.runAllTests().catch(console.error);
}

module.exports = InteractiveTerminalTester;
