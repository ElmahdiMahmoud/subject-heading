$(function() {

    console.log('[front.js] Ready');

    var $terms = $('ul');

    function getInput(defaultName, defaultPages) {
        var name = prompt('Enter a name of the term', defaultName || '');
        if ( ! name) {
            return false;
        }
        var pages = prompt(
            'Enter a numbers of pages where term "' + name + '" is located (comma-separated)',
            defaultPages || ''
        );
        if ( ! pages) {
            return false;
        }
        return { name: name, pages: pages };
    }

    function sendInput(to, data) {
        $.post(
            '/' + to,
            data,
            function(response, status ,xhr) {
                if (response && response.result) {
                    document.location.reload();
                }   
            },
            'json'
        );
    }

    $('.add_root').on('click', function(ev) {
        var input = getInput();
        if ( ! input) {
            return false;
        }
        sendInput('add_root', input);
    });

    $('.edit').on('click', function(ev) {
        var $el = $(ev.currentTarget),
            $li = $el.closest('li');
        var id = $el.closest('li').data('id');
        var input = getInput($li.children('label').text(), $li.children('i').text());
        if ( ! input) {
            return false;
        }
        _.extend(input, { id : id });
        sendInput('edit', input);
    });

    $('.delete').on('click', function(ev) {
        var $el = $(ev.currentTarget),
            $li = $el.closest('li');
        var id = $li.data('id');
        sendInput('delete', { id: id });
    });

    $('.add_sub').on('click', function(ev) {
        var $el = $(ev.currentTarget),
            $li = $el.closest('li');
        var parent_id = $li.data('id');
        var input = getInput();
        if ( ! input) {
            return false;
        }
        _.extend(input, { parent_id : parent_id });
        sendInput('add_sub', input);
    });

    if (search) {
        $('li label').each(function() {
            var matched = $(this).text().match(new RegExp(search, 'gi'));
            _.each(matched || [], function(found) {
                $(this).html( $(this).text().replace(matched, '<b class="found">' + matched + '</b>' ) );
            }, this);            
        });
    }

});