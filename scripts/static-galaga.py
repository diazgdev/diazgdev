import sys
from xml.etree import ElementTree as ET

ET.register_namespace('', 'http://www.w3.org/2000/svg')
root = ET.parse(sys.argv[1]).getroot()
for parent in list(root.iter()):
    for child in list(parent):
        tag = child.tag.split('}')[-1]
        if tag == 'animate':
            name = child.get('attributeName')
            first = (child.get('values') or child.get('from') or '').split(';')[0]
            if name and first:
                parent.set(name, first)
            parent.remove(child)
        elif tag == 'animateTransform':
            first = (child.get('values') or child.get('from') or '').split(';')[0]
            if first:
                parent.set('transform', child.get('type', 'translate') + '(' + first + ')')
            parent.remove(child)
for index, circle in enumerate(root.findall('{http://www.w3.org/2000/svg}circle')):
    circle.set('cy', str((index * 41 + 13) % 259))
ET.ElementTree(root).write(sys.argv[2], encoding='unicode')
