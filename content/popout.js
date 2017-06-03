var dockManager;
var panels = {};

function onLoad () {
    // Convert a div to a dock manager.  Panels can then be docked on to it
    dockManager = new dockspawn.DockManager(document.querySelector("#dock_container"));
    dockManager.initialize();

    var _panels = Array.from(document.querySelectorAll(".panel"));
    _panels.sort(function (l, r) { return parseInt(l.getAttribute("order")) - parseInt(r.getAttribute("order")); });

    var documentNode = dockManager.context.model.documentManagerNode;

    for (var i = 0, l = _panels.length; i < l; i++) {
        var p = _panels[i];
        var pc = new dockspawn.PanelContainer(p, dockManager, p.getAttribute("caption"));
        pc._element = p;
        panels[p.id] = pc;
        dockManager.dockFill(documentNode, pc);
    }

    for (var k in panels) {
        var p = panels[k];
        if (p._element.hasAttribute("default"))
            documentNode.container.setActiveChild(p);
    }

    /*
    // Let the dock manager element fill in the entire screen
    window.on.resize.add(onResized);
    onResized(null);

    // Convert existing elements on the page into "Panels". 
    // They can then be docked on to the dock manager 
    // Panels get a titlebar and a close button, and can also be 
    // converted to a floating dialog box which can be dragged / resized 
    var solution = new PanelContainer(query("#solution_window"), dockManager);
    var output = new PanelContainer(query("#output_window"), dockManager);
    var properties = new PanelContainer(query("#properties_window"), dockManager);
    var toolbox = new PanelContainer(query("#toolbox_window"), dockManager);
    var outline = new PanelContainer(query("#outline_window"), dockManager);
    var problems = new PanelContainer(query("#problems_window"), dockManager);
    var editor1 = new PanelContainer(query("#editor1_window"), dockManager);
    var editor2 = new PanelContainer(query("#editor2_window"), dockManager);

    // Dock the panels on the dock manager
    DockNode documentNode = dockManager.context.model.documentManagerNode;
    DockNode solutionNode = dockManager.dockLeft(documentNode, solution, 0.20);
    DockNode outlineNode = dockManager.dockFill(solutionNode, outline);
    DockNode propertiesNode = dockManager.dockDown(outlineNode, properties, 0.6);
    DockNode outputNode = dockManager.dockDown(documentNode, output, 0.4);
    DockNode problemsNode = dockManager.dockRight(outputNode, problems, 0.40);
    DockNode toolboxNode = dockManager.dockRight(documentNode, toolbox, 0.20);

    DockNode editor1Node = dockManager.dockFill(documentNode, editor1);
    DockNode editor2Node = dockManager.dockFill(documentNode, editor2);
    */

}

function onResize () {
    dockManager.resize(window.innerWidth, window.innerHeight);
}

window.addEventListener("load", onLoad);
window.addEventListener("resize", onResize);