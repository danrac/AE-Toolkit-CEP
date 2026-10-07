from pathlib import Path
import struct, zlib, json, csv

root = Path('/private/tmp/toolbox-hd-fixtures')
root.mkdir(exist_ok=True)
w, h = 1920, 1080

def canvas(): return bytearray(w*h*4)
def rect(pixels, x, y, width, height, color):
    for yy in range(max(0,y), min(h,y+height)):
        left, right = max(0,x), min(w,x+width)
        if right > left:
            start = (yy*w+left)*4
            pixels[start:start+(right-left)*4] = bytes(color)*(right-left)
def outline(pixels, x, y, width, height, color, thickness=3):
    rect(pixels,x,y,width,thickness,color); rect(pixels,x,y+height-thickness,width,thickness,color)
    rect(pixels,x,y,thickness,height,color); rect(pixels,x+width-thickness,y,thickness,height,color)
def write_png(name, pixels):
    def chunk(tag, data): return struct.pack('>I',len(data))+tag+data+struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)
    raw = b''.join(b'\x00'+pixels[y*w*4:(y+1)*w*4] for y in range(h))
    output = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0)) + chunk(b'IDAT',zlib.compress(raw,9)) + chunk(b'IEND',b'')
    path = root/name; path.write_bytes(output); return str(path)

matte = canvas(); visible_height = round(w/2.39); bar = (h-visible_height)//2
rect(matte,0,0,w,bar,(0,0,0,255));rect(matte,0,h-bar,w,bar,(0,0,0,255))
matte_path = write_png('TEST_HD_239_Matte.png',matte)
safe = canvas()
outline(safe,96,54,1728,972,(70,230,135,255))
outline(safe,192,108,1536,864,(250,180,85,255))
safe_path = write_png('TEST_HD_Safe_90_80.png',safe)
grid = canvas()
for x in (w//3,2*w//3):rect(grid,x-1,0,2,h,(70,190,255,210))
for y in (h//3,2*h//3):rect(grid,0,y-1,w,2,(70,190,255,210))
rect(grid,w//2-1,0,2,h,(70,190,255,150));rect(grid,0,h//2-1,w,2,(70,190,255,150))
rect(grid,w//2-20,h//2-2,40,4,(255,255,255,255));rect(grid,w//2-2,h//2-20,4,40,(255,255,255,255))
grid_path = write_png('TEST_HD_Grid.png',grid)
(root/'test-template.json').write_text(json.dumps({'id':'temporary-hd-test','client':'Toolbox Test','name':'HD Test Guides + Matte','formatCode':'HD-TEST','width':w,'height':h,'fps':24,'assets':{'matte':matte_path,'chartOne':safe_path,'chartTwo':grid_path}},indent=2))
with (root/'HD_Test_Formats.csv').open('w',newline='') as file:
    writer=csv.writer(file);writer.writerow(['CLIENT','PREFIX (Menu Item Name)','ASPECT (Format Code)','SizeX','SizeY','Matte','Chart1','Chart2','FPS'])
    writer.writerow(['Toolbox Test','HD Test Guides + Matte','HD-TEST',w,h,matte_path,safe_path,grid_path,24])
print(json.dumps({'folder':str(root),'csv':str(root/'HD_Test_Formats.csv'),'matte':matte_path,'guides':[safe_path,grid_path],'size':[w,h]}))
