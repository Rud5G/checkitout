/**
 * CheckItOut extension
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.txt.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/osl-3.0.php
 *
 * @category   EcomDev
 * @package    EcomDev_CheckItOut
 * @copyright  Copyright (c) 2016 EcomDev BV (http://www.ecomdev.org)
 * @license    https://opensource.org/licenses/osl-3.0.php  Open Software License (OSL 3.0)
 * @author     Ivan Chepurnyi <ivan.chepurnyi@ecomdev.org>
 */

// Change prototype scripts eval scope to global
String.prototype.evalScripts = function () {
    return this.extractScripts().map(function(script) {
        return window.globalEval(script);
    });
};

// Thanks to http://perfectionkills.com/global-eval-what-are-the-options/ for information
// Fix for global scoping of evalScripts
var globalEval = (function() {
    var isIndirectEvalGlobal = (function(original, Object) {
        try {
            // Does `Object` resolve to a local variable, or to a global, built-in `Object`,
            // reference to which we passed as a first argument?
            return (1,eval)('Object') === original;
        }
        catch(err) {
            // if indirect eval errors out (as allowed per ES3), then just bail out with `false`
            return false;
        }
    })(Object, 123);

    if (isIndirectEvalGlobal) {
        // if indirect eval executes code globally, use it
        return function(expression) {
            return (1,eval)(expression);
        };
    }
    else if (typeof window.execScript !== 'undefined') {
        // if `window.execScript exists`, use it
        return function(expression) {
            return window.execScript(expression);
        };
    }
// otherwise, globalEval is `undefined` since nothing is returned
})();

// Support for payment methods that override review.onSave method of OPC
Event.observe(window, 'load', function () {
    if (window.review && Object.isFunction(review.onSave)) {
        if (checkout.config.save !== review.saveUrl) {
            checkout.config.save = review.saveUrl;
        }

        review.nextStep = checkout.submitComplete.bind(checkout);
        checkout.submitComplete = function (response) {
            checkout.hideMask();
            review.onSave(response);
        };
    }
});

/**
 * Override of ajax error method, since it doesn't work as expected for multiple ajax messages
 *
 * @param elm
 * @param errorMsg
 */
Object.extend(Validation, {
    showAdvice : function(elm, advice, adviceName){
        if(!elm.advices){
            elm.advices = new Hash();
        }
        else{
            this.hideAllAdvices(elm, advice);
        }
        elm.advices.set(adviceName, advice);
        if(typeof Effect == 'undefined') {
            advice.style.display = 'block';
        } else {
            if(!advice._adviceAbsolutize) {
                if (advice.currentEvent) {
                    advice.currentEvent.cancel();
                    advice.currentEvent = false;
                }
                advice.currentEvent = new Effect.Appear(advice, {duration : 1 });
            } else {
                Position.absolutize(advice);
                advice.show();
                advice.setStyle({
                    'top':advice._adviceTop,
                    'left': advice._adviceLeft,
                    'width': advice._adviceWidth,
                    'z-index': 1000
                });
                advice.addClassName('advice-absolute');
            }
        }
    },
    reset: Validation.reset.wrap(function ($super, elm) {
        $super(elm);
        this.hideAllAdvices(elm);
    }),
    hideAllAdvices: function (elm) {
        var currentAdvice = false;
        if (arguments.length > 1) {
            currentAdvice = arguments[1];
        }
        if (elm.advices) {
            elm.advices.each(function(pair){
                if (!currentAdvice || pair.value.id != currentAdvice.id) {
                    // hide non-current advice after delay
                    this.hideAdvice(elm, pair.value);
                }
            }.bind(this));
        }
    },
    hideAdvice : function(elm, advice){
        if (advice != null) {
            if (advice.currentEvent) {
                advice.currentEvent.cancel();
                advice.currentEvent = false;
            }
            advice.currentEvent = new Effect.Fade(advice, {duration : 1, afterFinishInternal : function() {advice.hide();}});
        }
    },
    ajaxError: function(elm, errorMsg) {
        var name = 'validate-ajax';
        var advice = Validation.getAdvice(name, elm);

        if (advice == null) {
            advice = this.createAdvice(name, elm, false, errorMsg);
        } else {
            advice.update(errorMsg);
        }

        this.showAdvice(elm, advice, 'validate-ajax');
        this.updateCallback(elm, 'failed');

        elm.addClassName('validation-failed');
        elm.addClassName('validate-ajax');
        if (Validation.defaultOptions.addClassNameToContainer && Validation.defaultOptions.containerClassName != '') {
            var container = elm.up(Validation.defaultOptions.containerClassName);
            if (container && this.allowContainerClassName(elm)) {
                container.removeClassName('validation-passed');
                container.addClassName('validation-error');
            }
        }
    }
});
