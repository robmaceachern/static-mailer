var express = require('express');
var app = express();
var mandrill = require('mandrill-api/mandrill');
var bodyParser = require('body-parser');

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/send', function(request, response) {
    sendEmail(request, response);
});

if (!process.env.MAILER_MANDRILL_API_KEY) {
    console.log('MAILER_MANDRILL_API_KEY is not set!');
    process.exit(1);
}

var defaults = {
    subject: process.env.MAILER_DEFAULT_SUBJECT || 'Hello',
    fromEmail: process.env.MAILER_DEFAULT_FROM_EMAIL || 'hello@example.com',
    fromName: process.env.MAILER_DEFAULT_FROM_NAME || 'Static Mailer'
}

function sendEmail(request, response) {
    var message = {
        subject: request.param('_subject', defaults.subject),
        from_email: request.param('_fromEmail', defaults.fromEmail),
        from_name: request.param('_fromName', defaults.fromName),
        to: getRecipients(),
        headers: {
            "Reply-To": request.param('_replyTo')
        }
    };

    var messageContent = getMessageContent(request);
    message.html = messageContent.html;
    message.text = messageContent.text;

    var mandrill_client = new mandrill.Mandrill(process.env.MAILER_MANDRILL_API_KEY);

    mandrill_client.messages.send({
        "message": message,
        "async": false
    }, function(result) {
        console.log(result);
        var redirect = request.param('_next');
        if (redirect) {
            response.redirect(redirect);
        } else {
            response.send('Hello World!');
        }
    }, function(e) {
        // Mandrill returns the error as an object with name and message keys
        console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
        var failureURL = request.param('_failure');
        if (failureURL) {
            response.redirect(failureURL);
        } else {
            response.send('Sorry, we were not able to send the message at this time!');
        }
    });
}

function getRecipients() {
    return [{
        email: process.env.MAILER_DEFAULT_TO_EMAIL,
        name: process.env.MAILER_DEFAULT_TO_NAME,
        type: 'to'
    }];
}

function getMessageContent(request) {
    var bodyParams = request.body;
    var queryParams = request.query;

    var content = {
        html: '',
        text: ''
    };

    var body = request.param('_body');
    if (body) {
        content.html += '<p>' + body + '</p> ';
        content.text += body + '\n';
    }

    Object.keys(bodyParams).forEach(function(element) {
        if (element.lastIndexOf('_', 0) == 0) {
            // skip it
        } else {
            content.html += '<p>' + element + ': ' + bodyParams[element] + '</p> ';
            content.text += element + ': ' + bodyParams[element] + '\n';
        }
    });
    Object.keys(queryParams).forEach(function(element) {
        if (element.lastIndexOf('_', 0) == 0) {
            // skip it
        } else {
            content.html += '<p>' + element + ': ' + bodyParams[element] + '</p> ';
            content.text += element + ': ' + bodyParams[element] + '\n';
        }
    });
    return content;
}

app.listen(app.get('port'), function() {
    console.log("Node app is running at localhost:" + app.get('port'))
});