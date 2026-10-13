const buttonFeedbackStates = new WeakMap();

function setButtonFeedbackState(button, state, options = {}) {
    if (!button) return;

    const next = button.querySelector(`[data-${state}-content]`);
    const wrapper = button.querySelector('.submit-states');
    if (!wrapper || !next) {
        console.error(`No se encontró el estado "${state}" para el botón.`, button);
        return;
    }

    let feedback = buttonFeedbackStates.get(button);
    if (!feedback) {
        feedback = {
            current: wrapper.querySelector('.mostrar'),
            transitionToken: 0,
            timerToken: 0,
            timer: null,
        };
        buttonFeedbackStates.set(button, feedback);
    }

    if (feedback.timer) {
        clearTimeout(feedback.timer);
        feedback.timer = null;
    }

    button.disabled = state === 'loading';
    button.setAttribute('aria-busy', String(state === 'loading'));
    if (state === 'success' && options.resetAfter !== false) {
        const timerToken = ++feedback.timerToken;
        feedback.timer = setTimeout(() => {
            if (feedback.timerToken === timerToken) setButtonFeedbackState(button, 'normal');
        }, options.resetAfter ?? 1500);
    } else {
        feedback.timerToken++;
    }

    const transitionToken = ++feedback.transitionToken;
    if (feedback.current === next) return;

    const previous = feedback.current;
    feedback.current = next;
    wrapper.querySelectorAll(':scope > *').forEach((element) => {
        if (element === previous || element === next) return;
        element.classList.remove('btn-exit', 'btn-enter', 'mostrar');
        element.classList.add('quitar');
    });
    [previous, next].filter(Boolean).forEach((element) => {
        element.classList.remove('btn-exit', 'btn-enter', 'mostrar');
        element.classList.add('quitar');
    });

    next.classList.remove('quitar');
    next.classList.add('mostrar', 'btn-enter');
    if (previous) {
        previous.classList.remove('btn-enter');
        previous.classList.add('btn-exit');
    }

    let completed = false;
    const finish = () => {
        if (completed) return;
        completed = true;
        clearTimeout(fallback);
        next.removeEventListener('animationend', onAnimationEnd);
        previous?.removeEventListener('animationend', onAnimationEnd);
        if (feedback.transitionToken !== transitionToken) return;
        previous?.classList.remove('btn-exit', 'btn-enter', 'mostrar');
        previous?.classList.add('quitar');
        next.classList.remove('btn-exit', 'btn-enter', 'quitar');
        next.classList.add('mostrar');
    };
    const onAnimationEnd = (event) => {
        if (event.target === previous || event.target === next) finish();
    };
    next.addEventListener('animationend', onAnimationEnd);
    previous?.addEventListener('animationend', onAnimationEnd);
    const fallback = setTimeout(finish, 350);
}

window.setButtonFeedbackState = setButtonFeedbackState;
