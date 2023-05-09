function Vector(x = 0, y = 0) {
    this.x = +x;
    this.y = +y;

    this.update = (x, y) => {
        this.x = +x;
        this.y = +y;
    }

    this.randomize = () => {
        this.x = (Math.random() * 99) | 0;
        this.y = (Math.random() * 99) | 0;
        return this;
    }

}

Vector.RandomPosition = () => new Vector((Math.random() * 99) | 0, (Math.random() * 99) | 0);

Vector.RandomDirection = () => {
    const d = (Math.random() * 4) | 0;

    switch (d) {
        case 0:
            return new Vector(Segment.SPEED.X, 0);
        case 1:
            return new Vector(-Segment.SPEED.X, 0);
        case 2:
            return new Vector(0, Segment.SPEED.Y);
    }
    return new Vector(0, -Segment.SPEED.Y);
}

class GameElement {
    constructor(id, x, y, color, padding, width, height, borderRadius) {
        GameElement.prototype.root = document.getElementById('root');
        this.element = document.createElement('div');
        this.element.id = id;
        this.element.style.background = color;
        this.element.style.padding = padding;
        this.element.style.margin = '0';
        this.element.style.width = width;
        this.element.style.height = height;
        this.element.style.position = 'absolute';
        this.element.style.borderRadius = borderRadius;

        this.position = new Vector(x, y);

        this.root.appendChild(this.element);
    }

    get x() {
        return +this.coordinates.x;
    }

    get y() {
        return +this.coordinates.y;
    }

    get position() {
        return this.coordinates;
    }

    set position({ x, y }) {
        if (!this.coordinates)
            this.coordinates = new Vector(x, y);
        else {
            this.coordinates.x = +x;
            this.coordinates.y = +y;
        }
        this.place();
    }

    place = () => {
        this.element.style.top = `${this.coordinates.y}%`;
        this.element.style.left = `${this.coordinates.x}%`;
    }

    collidesWith = object => Math.abs(this.x - object.x) <= 2 && Math.abs(this.y - object.y) <= 2;
}

// functional class
class Food extends GameElement {

    constructor(id) {
        const coordinates = new Vector().randomize();
        super(id, coordinates.x, coordinates.y, 'green', '5px', '1rem', '1em', '5px');

    }

    next = () => {
        this.coordinates.randomize();
        this.position = this.coordinates;
    }
}

class Segment extends GameElement {
    constructor(id, x, y, color, head = false) {
        super(id, x, y, (head ? "dark" : "") + color, '5px', '1rem', '1rem', '50%');
        this.id = id;
    }
}

class Snake {
    segments = [];

    get nextSegmentID() {
        `${this.name}#${this.segments.length}`;
    }

    get tail() {
        return this.segments.length ? this.segments[this.segments.length - 1] : null;
    }

    set newEnemy(snake) {
        this.enemy = snake;
    }

    reset = () => {
        this.segments = [];
        let start = Vector.RandomPosition(); // new Vector().randomize();
        const segment = new Segment(this.nextSegmentID, start.x, start.y, this.color, true);

        this.segments.push(segment);
        this.directionVector = Vector.RandomDirection();
        this.nextDirection = new Vector();
        this.speed = 0;
        this.score = 0;
    }

    constructor(name, color = 'red') {
        this.name = name;
        this.color = color;

        this.reset();

        this.enemy = null;
        this.foodTarget = null;
        this.timer = null;
        this.scoreboard = null;
        this.createScoreboard();
    }

    increaseSpeed = (delta = 5) => {
        if (this.speed < Snake.MAX_SPEED / 10) {
            this.speed += delta;
            this.animate();
        }
    }

    get target() {
        return this.foodTarget;
    }

    set target(food) {
        this.foodTarget = food;
    }

    get direction() {
        return this.directionVector ? this.directionVector : new Vector(0, 0);
    }

    set direction(newDirection) {
        this.directionVector = newDirection;
    }

    givePrize = () => {
        const seg = new Segment(this.nextSegmentID, this.tail.x - this.direction.x, this.tail.y - this.direction.y, this.color);
        this.segments.push(seg);
        this.increaseSpeed();
        this.score += Food.PRIZE;
        this.updateScoreboard();
    }

    handleCollisions = () => {
        // wall collisions:
        if (this.segments[0].x > 99)
            this.segments[0].position = { x: 0, y: this.segments[0].y };
        else if (this.segments[0].x < 0)
            this.segments[0].position = { x: 99, y: this.segments[0].y };
        if (this.segments[0].y > 99)
            this.segments[0].position = { x: this.segments[0].x, y: 0 };
        else if (this.segments[0].y < 0)
            this.segments[0].position = { x: this.segments[0].x, y: 99 };

        // food collision
        const myHead = this.segments[0];
        if (this.target && myHead.collidesWith(this.target)) {
            // new segment
            this.target.next();
            this.givePrize();
        }

        // enemy collision
        if (this.enemy) {
            const myHead = this.segments[0];
            for (const enemySegment of this.enemy.segments) {
                if (myHead.collidesWith(enemySegment)) {
                    this.lose();
                }
            }
        }

    }

    clearSegments = () => {
        while (this.segments.length) {
            const seg = this.segments.pop();
            seg.element.remove();
        }
        delete this.segments;
    }

    lose = () => {
        if (this.timer)
            clearInterval(this.timer);
        if (this.scoreboard)
            this.scoreboard.innerHTML = "CREASHED";
        setTimeout(() => {
            this.clearSegments();
            this.reset();
            this.animate();
            this.updateScoreboard();
        }, [2000]);
    }

    nextPosition = (direction = this.direction) => {
        return {
            x: this.segments[0].x + direction.x,
            y: this.segments[0].y + direction.y
        };
    }

    proceed = () => {
        for (let i = this.segments.length - 1; i > 0; i--) {
            this.segments[i].position = {
                x: this.segments[i - 1].x,
                y: this.segments[i - 1].y
            };
        }

        this.segments[0].position = this.nextPosition();

        this.handleCollisions();
    }

    nextMoveIsReversive = () =>
        // for example: when proceeding to right and turning back to left, its reversive
        this.segments.length > 1 && this.segments[1].collidesWith(this.nextPosition(this.nextDirection))

    handleInput = (right = 'd', left = 'a', up = 'w', down = 's') => {
        window.addEventListener('keypress', event => {
            switch (event.key.toLowerCase()) {
                case right:
                    if (!this.direction.x) {
                        this.nextDirection.update(Segment.SPEED.X, 0);
                        if (!this.nextMoveIsReversive())
                            this.direction.update(Segment.SPEED.X, 0);
                    }
                    break;
                case left:
                    if (!this.direction.x) {
                        this.nextDirection.update(-Segment.SPEED.X, 0);
                        if (!this.nextMoveIsReversive())
                            this.direction.update(-Segment.SPEED.X, 0);
                    }
                    break;
                case up:
                    if (!this.direction.y) {
                        this.nextDirection.update(0, -Segment.SPEED.Y);
                        if (!this.nextMoveIsReversive())
                            this.direction.update(0, -Segment.SPEED.Y);
                    }
                    break;
                case down:
                    if (!this.direction.y) {
                        this.nextDirection.update(0, Segment.SPEED.Y);
                        if (!this.nextMoveIsReversive())
                            this.direction.update(0, +Segment.SPEED.Y);
                    }
                    break;
            }
        });
    }

    animate = () => {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.proceed();

        }, [Snake.MAX_SPEED - this.speed]);
    }

    updateScoreboard = () => {
        if (this.scoreboard) {
            this.scoreboard.innerHTML = `${this.name}: ${+this.score} PPT`;

        }
    }
    createScoreboard = () => {
        this.scoreboard = document.createElement('h3');
        this.scoreboard.id = `${this.name}_score`;
        document.getElementById('root').appendChild(this.scoreboard);
        this.updateScoreboard();
    }
}

class Game {

    static Run() {
        const player1 = prompt("Hello! Enter the name of first player:", "Player1") || "Player1",
            player2 = prompt("And the name of second player:", "Player2") || "Player2";

        this.snakes = [new Snake(player1), new Snake(player2, 'blue')];
        this.snakes[0].handleInput();
        this.snakes[1].handleInput('6', '4', '8', '5');
        this.food = new Food("mainFood");
        this.food.next();

        for (let i = 0; i < this.snakes.length; i++) {
            this.snakes[i].animate();
            this.snakes[i].target = this.food;
            this.snakes[i].newEnemy = this.snakes[(i + 1) % 2];

        }

    }

}

// static variables

Segment.SPEED = { X: window && window.innerWidth ? 1920 / window.innerWidth : 1, Y: window && window.innerHeight ? 2 * 1080 / window.innerHeight : 2 };
Food.PRIZE = 5;
Snake.MAX_SPEED = 400;

Game.Run();
