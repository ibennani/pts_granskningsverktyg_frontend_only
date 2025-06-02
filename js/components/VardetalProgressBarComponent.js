// js/components/VardetalProgressBarComponent.js
export const VardetalProgressBarComponent = (function () {
    'use-strict';

    const CSS_PATH = 'css/components/vardetal_progress_bar_component.css';
    let container_ref;
    let label_element_ref;
    let progress_bar_wrapper_ref;
    let green_segment_ref, yellow_segment_ref, red_segment_ref;
    let marker_9_ref, marker_79_ref;

    // Helper-funktioner (kommer att hämtas från window)
    let Helpers_create_element_func;
    let Helpers_load_css_func;
    let Translation_t_func;

    async function init(
        _container,
        _helpers_create_element, // Skicka in Helpers
        _helpers_load_css,       // Skicka in Helpers
        _translation_t           // Skicka in Translation.t
    ) {
        container_ref = _container;
        Helpers_create_element_func = _helpers_create_element;
        Helpers_load_css_func = _helpers_load_css;
        Translation_t_func = _translation_t;

        if (!Helpers_create_element_func || !Helpers_load_css_func || !Translation_t_func) {
            console.error("[VardetalProgressBarComponent] CRITICAL: Core helper functions not provided during init!");
            return;
        }

        if (CSS_PATH) {
            try {
                const link_tag = document.querySelector(`link[href="${CSS_PATH}"]`);
                if (!link_tag) {
                    await Helpers_load_css_func(CSS_PATH);
                }
            } catch (error) {
                console.warn("Failed to load CSS for VardetalProgressBarComponent:", error);
            }
        }
    }

    function render(current_value, max_value = 500, thresholds = { green_end: 9, yellow_end: 79 }) {
        if (!container_ref || !Helpers_create_element_func || !Translation_t_func) {
            console.error("[VardetalProgressBarComponent] Cannot render: Component not initialized correctly or core functions missing.");
            if (container_ref) container_ref.innerHTML = `<p style="color:red;">Error rendering progress bar.</p>`;
            return;
        }
        container_ref.innerHTML = ''; // Rensa tidigare innehåll

        const numeric_value = (current_value === null || current_value === undefined) ? 0 : Number(current_value);
        const display_value = (current_value === null || current_value === undefined) ? '---' : numeric_value;

        // Skapa etikett
        label_element_ref = Helpers_create_element_func('p', {
            class_name: 'vardetal-progress-bar-label',
            // text_content: `${Translation_t_func('overall_vardetal_label', { defaultValue: "Värdetal" })}: ${display_value}`
        });
        label_element_ref.innerHTML = `${Translation_t_func('overall_vardetal_label', { defaultValue: "Värdetal" })}: <strong>${display_value}</strong>`;

        container_ref.appendChild(label_element_ref);

        // Skapa progressbar-wrapper
        progress_bar_wrapper_ref = Helpers_create_element_func('div', { class_name: 'vardetal-progress-bar-wrapper' });
        progress_bar_wrapper_ref.setAttribute('role', 'progressbar');
        progress_bar_wrapper_ref.setAttribute('aria-valuenow', String(numeric_value));
        progress_bar_wrapper_ref.setAttribute('aria-valuemin', '0');
        progress_bar_wrapper_ref.setAttribute('aria-valuemax', String(max_value));
        progress_bar_wrapper_ref.setAttribute('aria-label', `${Translation_t_func('overall_vardetal_label', { defaultValue: "Värdetal" })}: ${display_value}`);


        // Skapa segmenten
        green_segment_ref = Helpers_create_element_func('div', { class_name: 'vardetal-progress-segment green' });
        yellow_segment_ref = Helpers_create_element_func('div', { class_name: 'vardetal-progress-segment yellow' });
        red_segment_ref = Helpers_create_element_func('div', { class_name: 'vardetal-progress-segment red' });

        // Nollställ bredder
        green_segment_ref.style.width = '0%';
        yellow_segment_ref.style.width = '0%';
        red_segment_ref.style.width = '0%';

        // Beräkna och sätt bredder för segmenten
        let remaining_value = Math.min(Math.max(0, numeric_value), max_value); // Kläm fast värdet mellan 0 och max_value

        // Grönt segment
        const green_width_val = Math.min(remaining_value, thresholds.green_end + 1); // +1 för att inkludera värdet 9
        const green_percentage = (green_width_val / max_value) * 100;
        if (green_percentage > 0) {
            green_segment_ref.style.width = `${green_percentage}%`;
        }
        remaining_value -= green_width_val;

        // Gult segment
        if (remaining_value > 0) {
            const yellow_width_val = Math.min(remaining_value, (thresholds.yellow_end + 1) - (thresholds.green_end + 1));
            const yellow_percentage = (yellow_width_val / max_value) * 100;
            if (yellow_percentage > 0) {
                yellow_segment_ref.style.width = `${yellow_percentage}%`;
            }
            remaining_value -= yellow_width_val;
        }

        // Rött segment
        if (remaining_value > 0) {
            const red_percentage = (remaining_value / max_value) * 100;
            if (red_percentage > 0) {
                red_segment_ref.style.width = `${red_percentage}%`;
            }
        }
        
        // Lägg till segmenten i wrappern
        progress_bar_wrapper_ref.appendChild(green_segment_ref);
        progress_bar_wrapper_ref.appendChild(yellow_segment_ref);
        progress_bar_wrapper_ref.appendChild(red_segment_ref);

        // Skapa och lägg till markörer
        marker_9_ref = Helpers_create_element_func('div', { class_name: 'vardetal-progress-marker marker-9' });
        marker_79_ref = Helpers_create_element_func('div', { class_name: 'vardetal-progress-marker marker-79' });

        progress_bar_wrapper_ref.appendChild(marker_9_ref);
        progress_bar_wrapper_ref.appendChild(marker_79_ref);

        container_ref.appendChild(progress_bar_wrapper_ref);
    }

    function destroy() {
        if (container_ref) container_ref.innerHTML = '';
        container_ref = null;
        label_element_ref = null;
        progress_bar_wrapper_ref = null;
        green_segment_ref = null;
        yellow_segment_ref = null;
        red_segment_ref = null;
        marker_9_ref = null;
        marker_79_ref = null;
        // Nollställ inte helper-funktionerna, de ägs inte av komponenten
    }

    return {
        init,
        render,
        destroy
    };
})();