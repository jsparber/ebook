


var removeHider = function(){
    $('#hider').addClass('removing').on('transitionend', function(e){
        $('#hider').remove();
    });

};

var showBook = function(id) {
    var rb = $('#read-book');
    var ret = _.Deferred();
    var w = $('.panes-wrapper');
    w.removeClass('left').addClass('right');
    if(rb.find('.loading').length == 0) {
        rb.find('.content').append('<div id="spinner" class="loading" style="display:none"><div class="spinner"><div class="mask"><div class="maskedCircle"></div></div></div></div>');
    }
    rb.find('.loading').show();

    rb.data('reading', id);

    findBook(id).done(function(book){
        rb.find('.title').html(book.title);
        rb.data('chapter', book.chapter);
        rb.data('numChapters', book.num_chapters);
        asyncStorage.getItem('book_'+id+'_chapters_'+book.chapter, function(chapter){
            rb.find('.book-content').html(chapter);

            //TODO append button to load next chapter
            //TODO recover position and load current chapter
            rb.find('.loading').hide();
            rb.find('.chapter').removeClass('hidden');
            if(book.chapter == 0) {
                $('#prev-chapter').addClass('hidden');
            }

            rb.find('.content').get(0).scrollTop = book.scroll;
            ret.resolve();
        });
    }).fail(function(){
        w.removeClass('right').addClass('left');
        rb.find('.loading').hide();
        ret.reject();
    });
    return ret;
};

var loadBooks = function(update){


    //TODO get/save to asyncStorage and only update when necessary

    //TODO Make everything async

    //TODO save html by chapters and in separate store


    var getBooks = _.Deferred();
    var getBooksIds = _.Deferred();

    $('#index').find('.loading').show();
    asyncStorage.getItem('books', function(result) {

        if(!result) {
            result = [];
        }

//        console.log('got books', result);

        getBooks.resolve(result);

    });



    asyncStorage.getItem('savedBooksIds', function(result){
        if(!result) {
            result = [];
        }
        getBooksIds.resolve(result);
    });

    _.when(getBooks, getBooksIds).done(function(books, savedBooksIds){


        if(!$('#book-list').length) {
            $('#index').find('.content').prepend('<ul class="table-view" id="book-list"></ul>');
        }

        if(update || books.length === 0) {
            //$('.loading').hide();
            Suvato.progress('Updating ebook database');
            updateDatabase(books, savedBooksIds).done(function(){
                addDeleteLinks();
            });
        } else {
            $('#index').find('.loading').hide();
//            //console.log(books.length);
            if(books.length) {

                var list = '';
                for(var i=0;i<books.length;i++) {
                    var book = books[i];
                    if($('#'+book.id).length == 0){
                        list += '<li class="table-view-cell media" id="'+book.id+'"><a data-title="'+book.title+'" class="navigate-right" href="'+book.id+'"><img class="media-object pull-left" src="'+book.cover+'" width="42"><div class="media-body">'+book.title+'<p>'+book.author+'</p></div></a></li>';
                    }

                }
                $('#book-list').show().append(list);
                $('.no-books').hide();
                addDeleteLinks();
            }
        }




    });

//TODO read books from sdcard


};

var addDeleteLinks = function(){
//    $('#book-list').find('li').prepend('<a href="#" class="delete-book"><span class="icon icon-trash"></span></a>')
    $('#book-list').on('click', 'a.delete-book', function(e){
        e.preventDefault();
        var $el = $(e.currentTarget);
//        if(confirm('Delete this book from your SD card?')){
        //TODO delete book from sdcard and catalog
        var $li = $el.parent();
        var bookId = $li.attr('id');

        $li.addClass('removing');
        deleteBook(bookId).done(function(){
            $li.remove();
        });
//        }
    });
};

(function(){
    asyncStorage.getItem('reading', function(reading){
        if(reading) {
            showBook(reading).done(function(){
                removeHider();
            });

        } else {
            removeHider();
        }

    });

    loadBooks();
    $('.bar, .no-books').on('click', 'a', function(e){
        e.preventDefault();
        var target = e.currentTarget;
        var l = target.getAttribute('data-target');
        if(l) {
            $('.active').removeClass('active');
            $('#'+l).addClass('active');
        }

    }).on('click', 'a[data-refresh]', function(e){
        e.preventDefault();
        loadBooks(true);

    }).on('click','a.chapter', function(e){
        e.preventDefault();
        var add = -1;
        if(e.currentTarget.getAttribute('id') == 'next-chapter') {
            add = 1;
        }
        var rb = $('#read-book');

        rb.find('.book-content').html('');
        rb.find('.loading').show();
        rb.find('.chapter').removeClass('hidden');
        var curChapter = parseInt(rb.data('chapter'));
        //console.log('current chapter', curChapter);
        var nextChapter = curChapter + add;
        var numChapters = parseInt(rb.data('numChapters'));

        if(nextChapter <= 0) {
            nextChapter = 0;
            $('#prev-chapter').addClass('hidden');
        }
        if(nextChapter >= numChapters - 1) {
            nextChapter = numChapters - 1
            $('#next-chapter').addClass('hidden');
        }

        //TODO check if we are at the last or first chapter
        asyncStorage.getItem('book_'+rb.data('reading')+'_chapters_'+nextChapter, function(chapter){
            rb.find('.book-content').html(chapter);
            rb.find('.loading').hide();

            rb.data('chapter', nextChapter);

            rb.find('.content').get(0).scrollTop = 0;
        });
        updateBook(rb.data('reading'), {chapter: nextChapter});

    });


    $('.pane').on('click', 'a[data-back]', function(e){

        e.preventDefault();
        $('.panes-wrapper').removeClass('right').addClass('left');
        //Save scroll position for current book
        var rb = $('#read-book');

        var bookId = rb.data('reading');
        var chapter = rb.data('chapter');
        var scrl = rb.find('.content').get(0).scrollTop;
        //console.log('scroll position is ', scrl);
        asyncStorage.setItem('reading', false);
        updateBook(bookId, {scroll: scrl, chapter: chapter});

        rb.find('.book-content').empty();

    }).on('click', 'a', function(){
        if(ta) clearTimeout(ta);
    });
    var ta = null;
    var timer = null;
    $('.book-content').on('click', 'a', function(e){
        e.preventDefault();
        //Scroll to element;
        var id = e.currentTarget.getAttribute('href');
        var obj = $(id);
        obj.css({'display': 'inline-block', 'position': 'relative'});
        var childPos = obj.offset();
        var parentPos = obj.parents('.book-content').offset();

        $('#read-book').find('.content').get(0).scrollTop = childPos.top - parentPos.top - 20;

    }).on('touchstart', function(e){
        //TODO Only if not scrolled to the end




        $('#read-book-bar').removeClass('hidden');
        if(ta) clearTimeout(ta);
        ta = setTimeout(function(){
            $('#read-book-bar').addClass('hidden');
        }, 4000);
    });
    $('#read-book').find('.content').on('scroll', function(e){
        //console.log(e);
        if(timer !== null) {
            clearTimeout(timer);
        }

        timer = setTimeout(function(){
            var $el = $('#read-book').find('.content');
            //console.log($el.get(0).scrollTop, $el.get(0).offsetHeight, $el.find('.book-content').get(0).offsetHeight);
            if($el.get(0).scrollTop + $el.get(0).offsetHeight >= $el.find('.book-content').get(0).offsetHeight-50) {
                if(ta) clearTimeout(ta);
                $('#read-book-bar').removeClass('hidden');
            }

        }, 150);
    });
    var startX;
    var currentPos = 0;
    var prevX = 0;
    $('#index').on('click', 'a.navigate-right', function(e){

        e.preventDefault();

        var target = e.currentTarget;
        var id = target.getAttribute('href');
        var rb = $('#read-book');
        rb.find('.title').html(target.getAttribute('data-title'));
        showBook(id);
        asyncStorage.setItem('reading', id);

    }).on('touchstart', 'li', function(e){
        var touches = e.changedTouches;
        var $el = $(e.currentTarget);
        startX = touches[0].pageX;
        prevX = touches[0].pageX;
        var lis = $el.find('a');
        lis.css({'transition': ''});

    }).on('touchend', 'li', function(e){
        var $el = $(e.currentTarget);
        var touches = e.changedTouches;
        var moveX = - (currentPos - (touches[0].pageX - startX));
        var lis = $el.find('a');
        lis.css({'transform': '', 'transition': 'transform 0.8s'});
        if(moveX <= 0) {
            $el.removeClass('deleting');
        }else if(moveX >= 70) {

            $el.addClass('deleting');

        } else {
            $el.removeClass('deleting');
        }

    }).on('touchmove', 'li', function(e){
        var $el = $(e.currentTarget);
        var touches = e.changedTouches;

        var moveX = - (currentPos - (touches[0].pageX - startX));
        var lis = $el.find('a');
        if(moveX <= 0) {
            moveX = 0;

        }else if(moveX >= 80) {
            moveX = 80;

        }
        lis.css({'transform': 'translateX('+moveX+'px)'});

        prevX = touches[0].pageX;
    });

    $('#add-book').on('click', 'a.new-book.check-right', function(e){
        e.preventDefault();
        //TODO close add book modal and read book
    })
        .on('click', 'a.new-book.navigate-right', function(e){
        e.preventDefault();
        var url = e.currentTarget.getAttribute('href');

        var $e = $(e.currentTarget);
        $e.prepend('<div class="book-loader"></div>');

        url = url.split("?")[0];

        var xhr = new window.XMLHttpRequest({mozSystem: true});
        setTimeout(function(){
            $e.find('.book-loader').addClass('start');
        }, 20);


        xhr.open('GET', url, true);

        xhr.responseType = 'arraybuffer';

        xhr.addEventListener("progress", function updateProgress (e) {
            if (e.lengthComputable) {
                var percentComplete = (2-(e.loaded / e.total)) * 95;
                ////console.log('progress', percentComplete);
                var val = 'translate3d(-'+percentComplete+'%, 0, 0)';
                $e.find('.book-loader').css({'transform': val});
                // ...
            }
        }, false);

        xhr.addEventListener("load", function(e) {
            var val = 'translate3d(-50%, 0, 0)';
            $e.find('.book-loader').css({'transform': val});
            if (e.target.status == 200) {
                var contentType = e.target.getResponseHeader('content-type');
                var contentDisposition = e.target.getResponseHeader('content-disposition');

                var blob = new Blob([e.target.response], { type: contentType });
                var a = contentDisposition.substr(contentDisposition.indexOf('"')+1);
                var fname = 'ebooks/'+a.substring(0, a.length - 1);


                var sdcard = navigator.getDeviceStorage("sdcard");
//                var request = sdcard.addNamed(blob, fname);
                var request = sdcard.addNamed(blob, fname);

                //console.log(blob);

                request.onsuccess = function () {
                    var name = this.result;
//                    console.log('File "' + name + '" successfully wrote on the sdcard storage area');



                    if(blob && (blob.type == 'application/epub+zip'|| fname.substr(fname.length - 4) == 'epub')) {
                        var reader = new FileReader();
                        reader.readAsBinaryString(blob);
                        reader.onload = function(e){

                            var epub = new JSEpub(e.target.result);

                            epub.processInSteps(function (step, extras) {

                                if (step === 4) {
                                    showFirstPage(epub).done(function(book) {
                                        book.path = name;
                                        asyncStorage.getItem('books', function(books) {

                                            if(!books) {
                                                books = [];
                                            }
                                            books.push(book);
                                            //console.log(book, books);

                                            asyncStorage.setItem('books', books, function(){
                                                //console.log(book.title + ' was added to your library');

                                                book = null;
                                            });


                                        });

                                        asyncStorage.getItem('savedBooksIds', function(savedBooksIds){
                                            if(!savedBooksIds) {
                                                savedBooksIds = [];
                                            }
                                            savedBooksIds.push(fname);
                                            asyncStorage.setItem('savedBooksIds', savedBooksIds);
                                        });
                                    });

                                } else if(step===5){


                                    $e.find('.book-loader').css({'transform': 'translate3d(0, 0, 0)'}).addClass('removing').on('transitionend', function(){
                                        $e.removeClass('navigate-right').addClass('check-right');

                                        $(this).remove();
                                    });
                                } else if(step===6){
                                    console.log('progress', extras);
                                    var p = 50 - extras.progress/2;
                                    $e.find('.book-loader').css({'transform': 'translate3d(-'+p+'%, 0, 0)'});
                                }
                            });

                        };

                    }


                };


                request.onerror = function (e) {
                    //console.log(e);
                    if (e.target.error.name =='NoModificationAllowedError'){
                        Suvato.error('This book already exists on your SD card', 5000);
                        $e.removeClass('navigate-right').addClass('check-right');
                    } else {
                        Suvato.error('Could not write book to SD card', 5000);
                    }

                };
            }
        }, false);

        xhr.addEventListener("error", function(e){
            Suvato.error('Could not download this book', 5000);
//            console.error('error', e);
        }, false);

        xhr.addEventListener("abort", function(e){
            Suvato.error('Download aborted', 5000);
//            console.error('error', e);
        }, false);


        xhr.send();



    });

    document.addEventListener("visibilitychange", function() {
//        console.log( document.visibilityState );
        if(document.visibilityState == 'hidden' && $('.panes-wrapper').hasClass('right')){
            var rb = $('#read-book');
            var bookId = rb.data('reading');
            asyncStorage.setItem('reading', bookId);
            var scrl = rb.find('.content').get(0).scrollTop;
//        //console.log('scroll position is ', scrl);
            updateBook(bookId, {scroll: scrl});
        }else {
            asyncStorage.setItem('reading', false);
        }
    });

    asyncStorage.getItem('books', function(books) {
        navigator.mozL10n.ready( function() {

            //console.log(navigator.mozL10n.language.code);
            var lang = navigator.mozL10n.language.code.substr(0,2);
            var url = 'http://www.feedbooks.com/books/top.atom?lang='+lang;
            console.log(url);



            OPDS.access(url, function(catalog){
//                console.log(catalog);
                var content = '';
//                var def = _.Deferred();

                _.each(catalog.entries, function(entry){
                    var bookExists = _.find(books, function(b){
                        return b.title == entry.title;
                    });
                    var cl = 'navigate-right';
                    if(bookExists){
                        cl = 'check-right';
                    }

                    //                        console.log('entry', entry.title, entry);
                    var epubLink = _.find(entry.links, function(link){
                        return link.rel == 'http://opds-spec.org/acquisition' && link.type == 'application/epub+zip';
                    });
                    if(epubLink) {
                        var thumbnail = _.find(entry.links, function(link){
                            return link.rel == 'http://opds-spec.org/image/thumbnail';
                        });
//                        console.log(thumbnail);
                        content += '<li class="table-view-cell media" id="'+entry.id+'"><a class="'+cl+' new-book" href="'+epubLink.url+'"><img class="media-object pull-left" src="'+thumbnail.url+'" width="42"><div class="media-body">'+entry.title+'<p>'+entry.author.name+'</p></div></a></li>';
                    }

                });
                $('#add-book-list').html(content);

                //get Next page link

                var getNextPage = function(catalog){
                    var ret = _.Deferred();
//                    console.log('getting next page for', catalog);
                    var nextLink = _.find(catalog.links, function(link){
                        return (link.rel == 'next');
                    });

                    var nextContent = '';
                    nextLink.navigate(function(feed){
//                        console.log('feed', feed);

                        _.each(feed.entries, function(entry){
                            var bookExists = _.find(books, function(b){
                                return b.title == entry.title;
                            });
                            var cl = 'navigate-right';
                            if(bookExists){
                                cl = 'check-right';
                            }

                            var epubLink = _.find(entry.links, function(link){
                                return link.rel == 'http://opds-spec.org/acquisition' && link.type == 'application/epub+zip';
                            });
                            if(epubLink) {
                                var thumbnail = _.find(entry.links, function(link){
                                    return link.rel == 'http://opds-spec.org/image/thumbnail';
                                });
//                                console.log(thumbnail);
                                nextContent += '<li class="table-view-cell media" id="'+entry.id+'"><a class="'+cl+' new-book" href="'+epubLink.url+'"><img class="media-object pull-left" src="'+thumbnail.url+'" width="42"><div class="media-body">'+entry.title+'<p>'+entry.author.name+'</p></div></a></li>';
                            }

                        });
                        $('#add-book-list').append(nextContent+'<a href="#" class="btn btn-block next-page">Next</a>');
                        $('#add-book-list').on('click', '.next-page', function(e){
                            e.preventDefault();
                            $('#add-book-list').off('click', '.next-page');
                            $('.next-page').addClass('removing').on('transitionend', function(){
                                $(this).remove();

                            });
                            nextContent = '';
                            getNextPage(feed).done(function(){


                            });
                        });
                        ret.resolve();
                    });
                    return ret;
                };
                getNextPage(catalog);



            }, new OPDS.Support.MyBrowser());
        });
    });

    $('#find-books').on('submit', function(e){
        e.preventDefault();
        //console.log(e.currentTarget);
        var search = $('#search').val();
        var lang = navigator.mozL10n.language.code.substr(0,2);
        var url = 'http://www.feedbooks.com/search.atom?query='+search+'&lang='+lang;
        var books = [];
        asyncStorage.getItem('books', function(b) {
            books = b;
        });
        OPDS.access(url, function(catalog){
//                console.log(catalog);
            var content = '';
            var booksDone = [];
            _.each(catalog.links, function(link){
                //console.log('link', link);
                if (link.title){
                    //                //console.log(link.navigate);
                    link.navigate(function(feed){
                        //                    content += '<li class="table-view-divider">'+feed.title+'</li>';

                        _.each(feed.entries, function(entry){
                            var bookExists = _.find(books, function(b){
                                return b.title == entry.title;
                            });
                            var cl = 'navigate-right';
                            if(bookExists){
                                cl = 'check-right';
                            }

                            //                        //console.log('entry', entry.title, entry);
                            var epubLink = _.find(entry.links, function(link){
                                return link.rel == 'http://opds-spec.org/acquisition' && link.type == 'application/epub+zip';
                            });
                            if(epubLink && _.indexOf(booksDone, epubLink.url) == -1) {
                                booksDone.push(epubLink.url);
                                var thumbnail = _.find(entry.links, function(link){
                                    return link.rel == 'http://opds-spec.org/image/thumbnail';
                                });
                                content += '<li class="table-view-cell media" id="'+entry.id+'"><a class="'+cl+' new-book" href="'+epubLink.url+'"><img class="media-object pull-left" src="'+thumbnail.url+'" width="42"><div class="media-body">'+entry.title+'<p>'+entry.author.name+'</p></div></a></li>';
                            }

                        });
                        $('#add-book-list').html(content);
                    });
                }
            });

        });

    });

    $(document).on('click', 'a[href="^http"]', function(e){
        window.open(e.currentTarget.href);
    })

})();


