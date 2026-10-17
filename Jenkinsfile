pipeline {
    agent any

    parameters {
        choice(
            name: 'SERVER',
            choices: ['vps_erp'],
            description: 'اختر السيرفر اللي عايز تعملله Build'
        )
    }

    environment {
        ANGULAR_CONFIG = 'production'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup Node') {
            steps {
                sh '''
                    node --version
                    npm --version
                    npm i --legacy-peer-deps
                '''
            }
        }

        stage('Build per server') {
            steps {
                sh '''
                    cp src/environments/environment.prod.ts environment.prod.ts.bak

                    echo ">>> Building for ${SERVER}"

                    node -e "
                        const fs = require('fs');
                        const path = './src/environments/environment.prod.ts';
                        let content = fs.readFileSync(path, 'utf8');
                        content = content.replace(
                            /active_server:\\s*enviroment_types\\.[A-Za-z0-9_]+,?/,
                            'active_server: enviroment_types.${SERVER},'
                        );
                        fs.writeFileSync(path, content);
                        console.log('Set active_server => ${SERVER}');
                    "

                    export NODE_OPTIONS="--max_old_space_size=4096"
                    npm run ng -- build --configuration=$ANGULAR_CONFIG

                    case ${SERVER} in
                        vps_erp)
                            target="erp.smartapro.com"
                            ;;
                        *)
                            target="${SERVER}"
                            ;;
                    esac

                    echo ">>> Deploying to /var/www/$target/"
                    sudo rsync -a --delete dist/demo1/ /var/www/$target/
                    sudo chown -R www-data:www-data /var/www/$target/
                    sudo chmod -R 755 /var/www/$target/

                    cp environment.prod.ts.bak src/environments/environment.prod.ts
                '''
            }
        }
    }

    post {
        failure {
            sh 'cp environment.prod.ts.bak src/environments/environment.prod.ts || true'
        }
    }
}