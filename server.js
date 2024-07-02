const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const scriptsPath = path.join(__dirname, 'public', 'scripts');

const languageConfigs = {
    javascript: {
        dockerFile: path.join(__dirname, 'Dockerfile.javascript'),
        dockerImage: 'node:14',
        command: (code) => `node -e "${code.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`
    },
    python: {
        dockerFile: path.join(__dirname, 'Dockerfile.python'),
        dockerImage: 'python:3.9',
        command: (code) => `python -c "${code.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`
    },
    java: {
        dockerFile: path.join(__dirname, 'Dockerfile.java'),
        dockerImage: 'openjdk:11',
        command: (code) => {
            const script = `public class Script { public static void main(String[] args) { ${code} } }`;
            return `bash -c "echo '${script.replace(/'/g, `'"'"'`)}' > ${scriptsPath}/Script.java && javac ${scriptsPath}/Script.java && java -cp ${scriptsPath} Script"`;
        }
    }
};

app.post('/run', (req, res) => {
    const { code, language } = req.body;
    const config = languageConfigs[language];

    if (!config) {
        return res.status(400).json({ output: 'Unsupported language' });
    }

    exec(`docker build -f ${config.dockerFile} -t ${config.dockerImage} . && docker run --rm -v ${scriptsPath}:/scripts ${config.dockerImage} ${config.command(code)}`, (error, stdout, stderr) => {
        if (error) {
            return res.json({ output: stderr });
        }
        res.json({ output: stdout });
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
