/**
 * Created by samuel.garcia.ballesteros on 5/03/18.
 */

const readline = require('readline');

const {models} = require('./model');
const {log,biglog,errorlog, colorize} = require('./out');

const Sequelize = require('sequelize');

const validateId = (id) =>{

    return new Sequelize.Promise((resolve, reject) => {
        if (typeof id === "undefined"){
        reject(new Error(`Falta el parametro <id>.`));
    }else{
        id=parseInt(id);
        if(Number.isNaN(id)){
            reject(new Error(`El valor del parametro <id> no es un numero.`));
        }else{
            resolve(id);
        }
    }
})
}


const makeQuestion =(rl, text) => {
    return new Sequelize.Promise ((resolve, reject) => {
        rl.question(colorize(` ¿${text}? `, 'red'), answer => {
        resolve(answer.trim());
});
});
};


exports.helpCmd = (socket,rl) => {
    log(socket, 'Comandos:');
    log(socket, '   h|help - Muestra esta ayuda.');
    log(socket, '   show <id> - Muestra la pregunta y la respuesta el quiz indicado.');
    log(socket, '   add - Añadir un nuevo quiz interactivamente.');
    log(socket, '   delete <id> - Borrar el quiz indicado.');
    log(socket, '   edit <id> - Editar el quiz indicado.');
    log(socket, '   test <id> - Probar el quiz indicado.');
    log(socket, '   p|play - Jugar a preguntar aleatoriamente todos los quizzes.');
    log(socket, '   credits - Créditos.');
    log(socket, '   q|quit - Quitar el programa.');
    rl.prompt();
}


exports.listCmd = (socket, rl) => {

    models.quiz.findAll()
        .each(quiz => {
        log(socket,`[${colorize(quiz.id, 'magenta')}]:  ¿${quiz.question}?`);
})
.catch(error =>{
        errorlog(socket, error.message);
})
.then(()=>{
        rl.prompt();
})
}



exports.quitCmd = (socket, rl)=> {
    rl.close();
    socket.en();
}



exports.showCmd = (socket, rl,id) => {

    validateId(id)
        .then(id => models.quiz.findById(id))
.then(quiz => {
        if(!quiz){
        throw new Error (` No existe un quiz asociado al id=${id}.`);
    }
    log(socket, `  [${colorize(quiz.id,'magenta')}]: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
})
.catch(error => {
        errorlog(socket, error.message);
})
.then(() => {
        rl.prompt();
});

};



exports.addCmd = (socket,rl) => {

    makeQuestion(rl, 'Pregunta')
        .then(q => {
        return makeQuestion(rl, 'Respuesta')
            .then(a => {
            return {question: q, answer:a};
});
})
.then(quiz=>{
        return models.quiz.create(quiz);
})
.then((quiz) => {
        log(socket,`${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize(' => ','magenta')} ${quiz.answer}`);
})
.catch(Sequelize.ValidationError, error => {
        errorlog (socket, 'El quiz es erroneo:');
    error.errors.forEach(({message}) => errorlog(socket, message));
})
.catch(error => {
        errorlog(socket, error.message);
})
.then(() => {
        rl.prompt();
});

};



exports.testCmd = (socket, rl,id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
.then(quiz => {
        if (!quiz){
        throw new Error(` No existe un quiz asociado al id=${id}.`)
    }
    return new Promise((resolve, reject) => {


        makeQuestion(rl, quiz.question)
.then(answer => {
        if(answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()){
        log(socket, 'Su respuesta es correcta');
        biglog(socket, 'Correcta', 'green');
        resolve()
    }else{
        log(socket, 'Su respuesta es incorrecta');
        biglog(socket, 'Incorrecta', 'red');
        resolve()
    }
})
})
})
.catch(error => {
        errorlog(socket, error.message);
})
.then(() => {
        rl.prompt();
});

}


exports.playCmd =  (socket, rl) => {
    let score = 0;
    let toBeResolved = [];

    const playOne = () => {

        return Promise.resolve()
            .then (() => {
            if (toBeResolved.length <= 0) {
            log(socket, `Fin del juego. Aciertos: `);  //Fin del juego
            return;
        }
        let pos = Math.floor(Math.random() * toBeResolved.length);
        let quiz = toBeResolved[pos];
        toBeResolved.splice(pos, 1);

        return makeQuestion(rl, quiz.question)
            .then(answer => {
            if(answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim()) {
            score++;
            log(socket, `Respuesta correcta.`, 'green');
            return playOne();
        } else {
            log(socket, `Respuesta incorrecta.`, 'red');
            log(socket, `Fin del juego. Aciertos: `);
        }
    })
    })
    }

    models.quiz.findAll({raw: true})
        .then(quizzes => {
        toBePlayed = quizzes;
})
.then(() => {
        return playOne();
})
.catch(e => {
        console.log("error: " + e);
})
.then(() => {
        socket.write(score);
    rl.prompt();
})
};


exports.deleteCmd = (socket, rl,id) => {
    validateId(id)
        .then(id => models.quiz.destroy({where: {id}}))
.catch(error => {
        errorlog(socket, error.message);
})
.then(() => {
        rl.prompt();
});
};


exports.editCmd = (socket, rl,id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
.then(quiz => {
        if(!quiz){
        throw new Error(`No existe el parametro asociado ${id}.`);
    }

    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
    return makeQuestion(rl, ' Introduzca la pregunta: ')
        .then(q => {
        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
    return makeQuestion(rl, 'Introduzca la respuesta ')
        .then(a => {
        quiz.question =q;
    quiz.answer =a;
    return quiz;
});
});
})
.then(quiz => {
        return quiz.save();
})
.then(quiz => {
        log (socket, `Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`)
})
.catch(Sequelize.ValidationError, error => {
        errorlog(socket, 'El quiz es erroneo:');
    error.errors.forEach(({message}) => errorlog(socket, message));
})
.catch(error => {
        errorlog(socket, error.message);
})
.then(() => {
        rl.prompt();
});
}




exports.creditsCmd = (socket,rl) => {
    log(socket, 'Autores de la práctica:');
    log(socket, 'SAMUEL');
    log(socket, 'ADRIAN');
    rl.prompt();
};

exports.editCmd = (socket,rl,id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
.then(quiz => {
        if(!quiz){
        throw new Error(`No existe el parametro asociado ${id}.`);
    }

    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
    return makeQuestion(rl, ' Introduzca la pregunta: ')
        .then(q => {
        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
    return makeQuestion(rl, 'Introduzca la respuesta ')
        .then(a => {
        quiz.question =q;
    quiz.answer =a;
    return quiz;
});
});
})
.then(quiz => {
        return quiz.save();
})
.then(quiz => {
        log (socket, `Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`)
})
.catch(Sequelize.ValidationError, error => {
        errorlog(socket, 'El quiz es erroneo:');
    error.errors.forEach(({message}) => errorlog(socket, message));
})
.catch(error => {
        errorlog(socket, error.message);
})
.then(() => {
        rl.prompt();
});
}

exports.creditsCmd = (socket, rl) => {
    log(socket, 'Autores de la práctica:');
    log(socket, 'ADRIAN', 'green');
    log(socket, 'SAMUEL', 'green');
    rl.prompt();
};