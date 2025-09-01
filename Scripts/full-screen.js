class FullScreenController {
    constructor() {
        this.button = document.getElementById('fullscreenBtn');
        this.isFullScreen = false;
        
        this.init();
    }

    init() {
        // Check if fullscreen is supported
        if (!this.isFullscreenSupported()) {
            this.button.disabled = true;
            return;
        }

        // Add click listener
        this.button.addEventListener('click', () => this.toggleFullScreen());
        
        // Listen for fullscreen changes
        this.addFullscreenListeners();
    }

    isFullscreenSupported() {
        return !!(
            document.fullscreenEnabled ||
            document.webkitFullscreenEnabled ||
            document.mozFullScreenEnabled ||
            document.msFullscreenEnabled
        );
    }

    async toggleFullScreen() {
        try {
            if (this.isFullScreen) {
                await this.exitFullScreen();
                this.button.innerHTML = '<i class="material-icons">fullscreen</i>';
            } else {
                await this.enterFullScreen();
                this.button.innerHTML = '<i class="material-icons">fullscreen_exit</i>';
            }
        } catch (error) {
            M.toast({html: 'Unable to Toggle Fullscreen Mode!', classes: 'rounded toast-error', displayLength: 2000});
        }
    }

    async enterFullScreen() {
        const element = document.documentElement;
        
        if (element.requestFullscreen) {
            await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            await element.webkitRequestFullscreen();
        } else if (element.mozRequestFullScreen) {
            await element.mozRequestFullScreen();
        } else if (element.msRequestFullscreen) {
            await element.msRequestFullscreen();
        }
    }

    async exitFullScreen() {
        if (document.exitFullscreen) {
            await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            await document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            await document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            await document.msExitFullscreen();
        }
    }

    addFullscreenListeners() {
        const events = [
            'fullscreenchange',
            'webkitfullscreenchange',
            'mozfullscreenchange',
            'MSFullscreenChange'
        ];

        events.forEach(event => {
            document.addEventListener(event, () => this.handleFullscreenChange());
        });
    }

    handleFullscreenChange() {
        this.isFullScreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new FullScreenController();
});